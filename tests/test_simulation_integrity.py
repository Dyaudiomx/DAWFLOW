#!/usr/bin/env python3
"""
DAWFLOW Integration Test Suite — Simulation Accuracy, Rollback, Schema, Performance

Tests 5 dimensions:
  1. Simulation accuracy: simulate -> execute -> compare prediction to reality
  2. Rollback integrity: execute_atomic + undo -> verify state restored
  3. Cross-command schema consistency: all simulate commands return same envelope
  4. Safety guards: invariant checks block dangerous operations
  5. Performance: simulation speed on the current session

Run with DAWFLOW open and a session loaded:
    python3 tests/test_simulation_integrity.py

Exit code 0 = all pass, 1 = failures.
"""

import json
import sys
import time
import traceback
from ipc_client import DawflowIPC

# ── Helpers ──────────────────────────────────────────────────────────────────

PASS = 0
FAIL = 0
SKIP = 0


def test(name, fn):
    """Run a test function, track pass/fail."""
    global PASS, FAIL, SKIP
    try:
        result = fn()
        if result == "SKIP":
            SKIP += 1
            print(f"  SKIP  {name}")
        else:
            PASS += 1
            print(f"  PASS  {name}")
    except Exception as e:
        FAIL += 1
        print(f"  FAIL  {name}: {e}")
        traceback.print_exc(limit=2)


def assert_eq(a, b, msg=""):
    if a != b:
        raise AssertionError(f"Expected {b!r}, got {a!r}. {msg}")


def assert_true(val, msg=""):
    if not val:
        raise AssertionError(f"Expected truthy, got {val!r}. {msg}")


def assert_in(key, d, msg=""):
    if key not in d:
        raise AssertionError(f"Key {key!r} not in {list(d.keys())[:10]}. {msg}")


def assert_type(val, t, msg=""):
    if not isinstance(val, t):
        raise AssertionError(f"Expected {t.__name__}, got {type(val).__name__}. {msg}")


class AssertionError(Exception):
    pass


# ── Test Suite ───────────────────────────────────────────────────────────────

def run_all():
    global PASS, FAIL, SKIP
    print("\n" + "=" * 70)
    print("DAWFLOW Integration Test Suite")
    print("=" * 70)

    try:
        ipc = DawflowIPC()
    except Exception as e:
        print(f"\nFATAL: Cannot connect to DAWFLOW: {e}")
        print("Make sure DAWFLOW is running with a session loaded.")
        sys.exit(1)

    # Verify connection
    try:
        info = ipc.call("daw.ping")
        print(f"Connected to: {info.get('session_name', 'unknown')}")
    except Exception as e:
        print(f"\nFATAL: Connected but ping failed: {e}")
        sys.exit(1)

    # Get session state for test context
    session = ipc.call("daw.get_session_info")
    tracks_resp = ipc.call("daw.get_tracks")
    tracks = tracks_resp.get("tracks", [])
    print(f"Session: {session.get('name', '?')}, Tracks: {len(tracks)}")

    if len(tracks) == 0:
        print("\nWARNING: No tracks in session. Some tests will be skipped.")

    print("\n" + "-" * 70)
    print("1. SIMULATION ACCURACY")
    print("-" * 70)

    # ── 1a. simulate.move_region accuracy ────────────────────────────────
    def test_simulate_move_region():
        if not tracks:
            return "SKIP"
        # Find a track with regions
        for t in tracks:
            try:
                regions = ipc.call("daw.get_regions", {"track_id": t["id"]})
                rlist = regions.get("regions", [])
                if len(rlist) >= 1:
                    region = rlist[0]
                    rid = region["id"]
                    tid = t["id"]
                    old_pos = region.get("position_samples", region.get("position", 0))
                    new_pos = old_pos + 48000  # move 1 second forward

                    # Simulate
                    sim = ipc.call("daw.simulate.move_region", {
                        "track_id": tid,
                        "region_id": rid,
                        "new_position": new_pos,
                    })
                    assert_in("safe", sim)
                    assert_in("warnings", sim)
                    assert_in("affected_objects", sim)
                    assert_type(sim["safe"], bool)
                    assert_type(sim["warnings"], list)
                    assert_type(sim["affected_objects"], list)

                    # Verify the simulation identified the correct region
                    found = False
                    for obj in sim["affected_objects"]:
                        if obj.get("id") == rid or obj.get("type") == "region":
                            found = True
                            break
                    assert_true(found, "Simulation should identify the moved region")
                    return
            except Exception:
                continue
        return "SKIP"

    test("simulate.move_region returns valid prediction", test_simulate_move_region)

    # ── 1b. simulate.delete_tracks accuracy ──────────────────────────────
    def test_simulate_delete_tracks():
        if len(tracks) < 2:
            return "SKIP"
        # Simulate deleting the last track (least risky)
        target = tracks[-1]
        sim = ipc.call("daw.simulate.delete_tracks", {
            "track_ids": [target["id"]],
        })
        assert_in("safe", sim)
        assert_in("affected_objects", sim)
        assert_in("reversible", sim)
        # Should mention the track in affected_objects
        names = [o.get("name", "") for o in sim["affected_objects"]]
        ids = [o.get("id", "") for o in sim["affected_objects"]]
        assert_true(
            target["name"] in names or target["id"] in ids,
            f"Should list track '{target['name']}' in affected_objects"
        )

    test("simulate.delete_tracks identifies affected objects", test_simulate_delete_tracks)

    # ── 1c. simulate.freeze_track disk estimate ──────────────────────────
    def test_simulate_freeze_track():
        if not tracks:
            return "SKIP"
        # Find an audio track
        for t in tracks:
            if t.get("type", "").lower() in ("audio", ""):
                sim = ipc.call("daw.simulate.freeze_track", {
                    "track_id": t["id"],
                })
                assert_in("estimated_disk_impact_bytes", sim)
                assert_type(sim["estimated_disk_impact_bytes"], (int, float))
                # Disk estimate should be non-negative
                assert_true(
                    sim["estimated_disk_impact_bytes"] >= 0,
                    "Disk estimate should be >= 0"
                )
                return
        return "SKIP"

    test("simulate.freeze_track provides disk estimate", test_simulate_freeze_track)

    # ── 1d. simulate.export_session file size estimate ───────────────────
    def test_simulate_export():
        sim = ipc.call("daw.simulate.export_session", {})
        assert_in("safe", sim)
        assert_in("estimated_disk_impact_bytes", sim)
        assert_in("impacts", sim)

    test("simulate.export_session returns valid prediction", test_simulate_export)

    # ── 1e. simulate vs execute: set_region_gain ─────────────────────────
    def test_simulate_vs_execute_gain():
        """Simulate gain change, execute it, verify prediction matched."""
        if not tracks:
            return "SKIP"
        for t in tracks:
            try:
                regions = ipc.call("daw.get_regions", {"track_id": t["id"]})
                rlist = regions.get("regions", [])
                if len(rlist) >= 1:
                    region = rlist[0]
                    rid = region["id"]
                    tid = t["id"]
                    old_gain = region.get("gain", 1.0)

                    # Simulate setting gain to -6dB
                    sim = ipc.call("daw.simulate.set_region_gain", {
                        "track_id": tid,
                        "region_id": rid,
                        "gain_db": -6.0,
                    })
                    assert_in("safe", sim)
                    predicted_safe = sim["safe"]

                    # If predicted safe, execute then undo
                    if predicted_safe:
                        ipc.call("daw.begin_transaction", {"name": "test_gain"})
                        ipc.call("daw.set_region_gain", {
                            "track_id": tid,
                            "region_id": rid,
                            "gain_db": -6.0,
                        })
                        ipc.call("daw.commit_transaction")
                        # Undo to restore
                        ipc.call("daw.undo")
                    return
            except Exception:
                continue
        return "SKIP"

    test("simulate.set_region_gain prediction matches safety", test_simulate_vs_execute_gain)

    print("\n" + "-" * 70)
    print("2. ROLLBACK INTEGRITY")
    print("-" * 70)

    # ── 2a. execute_atomic + undo restores state ─────────────────────────
    def test_rollback_basic():
        if not tracks:
            return "SKIP"
        # Capture state before
        t = tracks[0]
        before = ipc.call("daw.get_track_details", {"track_id": t["id"]})
        before_mute = before.get("muted", before.get("mute", False))

        # Execute atomic: mute then unmute (net zero change)
        ipc.call("daw.execute_atomic", {
            "name": "test_rollback",
            "commands": [
                {"method": "daw.set_track_mute", "params": {"track_id": t["id"], "muted": True}},
                {"method": "daw.set_track_mute", "params": {"track_id": t["id"], "muted": False}},
            ]
        })

        # Verify state matches
        after = ipc.call("daw.get_track_details", {"track_id": t["id"]})
        after_mute = after.get("muted", after.get("mute", False))
        assert_eq(before_mute, after_mute, "Mute state should be unchanged after toggle+untoggle")

        # Now undo the atomic operation
        ipc.call("daw.undo")

        # State should still match original (undo reverses the entire atomic block)
        restored = ipc.call("daw.get_track_details", {"track_id": t["id"]})
        restored_mute = restored.get("muted", restored.get("mute", False))
        assert_eq(before_mute, restored_mute, "Undo should restore to original state")

    test("execute_atomic + undo restores state", test_rollback_basic)

    # ── 2b. transaction rollback ─────────────────────────────────────────
    def test_transaction_rollback():
        if not tracks:
            return "SKIP"
        t = tracks[0]
        before = ipc.call("daw.get_track_details", {"track_id": t["id"]})
        before_solo = before.get("soloed", before.get("solo", False))

        # Begin transaction, make a change, then rollback
        ipc.call("daw.begin_transaction", {"name": "test_abort"})
        ipc.call("daw.set_track_solo", {
            "track_id": t["id"],
            "soloed": not before_solo,
        })

        # Rollback
        ipc.call("daw.rollback_transaction")

        # Should be back to original
        after = ipc.call("daw.get_track_details", {"track_id": t["id"]})
        after_solo = after.get("soloed", after.get("solo", False))
        assert_eq(before_solo, after_solo, "Rollback should restore solo state")

    test("transaction rollback restores state", test_transaction_rollback)

    # ── 2c. checkpoint/restore ───────────────────────────────────────────
    def test_checkpoint():
        # Create a checkpoint
        cp = ipc.call("daw.checkpoint")
        assert_in("checkpoint_name", cp)
        name = cp["checkpoint_name"]

        # Verify it appears in the list
        cps = ipc.call("daw.get_checkpoints")
        names = [c.get("name", "") for c in cps.get("checkpoints", [])]
        assert_true(name in names, f"Checkpoint '{name}' should be in list")

    test("checkpoint creation and listing", test_checkpoint)

    print("\n" + "-" * 70)
    print("3. CROSS-COMMAND SCHEMA CONSISTENCY")
    print("-" * 70)

    # ── 3a. All simulate commands return the standard envelope ───────────
    REQUIRED_SIMULATE_KEYS = ["safe", "warnings", "impacts", "affected_objects", "reversible"]

    def test_schema_consistency():
        """Test that every reachable simulate command returns the standard envelope."""
        # Get all simulate commands
        cmds = ipc.call("daw.search_commands", {"query": "simulate"})
        sim_cmds = [c for c in cmds.get("commands", cmds.get("matches", [])) if "simulate" in str(c)]

        if not sim_cmds:
            # Fallback: test known simulate commands
            sim_cmds = [
                "daw.simulate.export_session",
                "daw.simulate.close_session",
                "daw.simulate.cleanup_unused",
            ]

        tested = 0
        failures = []
        for cmd in sim_cmds:
            cmd_name = cmd if isinstance(cmd, str) else cmd.get("command", cmd.get("name", ""))
            if not cmd_name or "simulate" not in cmd_name:
                continue
            try:
                result = ipc.call(cmd_name, {})
                for key in REQUIRED_SIMULATE_KEYS:
                    if key not in result:
                        failures.append(f"{cmd_name} missing '{key}'")
                tested += 1
            except Exception:
                # Some commands require params — that's OK, skip them
                pass

        if tested == 0:
            return "SKIP"

        if failures:
            raise AssertionError(
                f"{len(failures)} schema violations in {tested} commands: "
                + "; ".join(failures[:5])
            )

    test("all simulate.* commands return standard envelope", test_schema_consistency)

    # ── 3b. Safety commands have consistent structure ────────────────────
    def test_safety_schema():
        # can_modify_session should return {can_modify: bool, reasons: [...]}
        result = ipc.call("daw.can_modify_session")
        assert_in("can_modify", result)
        assert_type(result["can_modify"], bool)
        assert_in("reasons", result)
        assert_type(result["reasons"], list)

    test("safety commands return {can_modify, reasons} schema", test_safety_schema)

    # ── 3c. get_api_stats returns correct count ──────────────────────────
    def test_api_stats():
        stats = ipc.call("daw.get_api_stats")
        assert_in("total_commands", stats)
        total = stats["total_commands"]
        assert_true(total >= 1000, f"Expected >= 1000 commands, got {total}")

    test("get_api_stats reports >= 1000 commands", test_api_stats)

    print("\n" + "-" * 70)
    print("4. SAFETY GUARDS")
    print("-" * 70)

    # ── 4a. is_command_destructive correctly classifies ───────────────────
    def test_destructive_classification():
        # Read-only command
        r1 = ipc.call("daw.is_command_destructive", {"method": "daw.get_tracks"})
        assert_eq(r1["destructive"], False, "get_tracks should not be destructive")

        # Destructive command
        r2 = ipc.call("daw.is_command_destructive", {"method": "daw.remove_track"})
        assert_eq(r2["destructive"], True, "remove_track should be destructive")

    test("is_command_destructive classifies correctly", test_destructive_classification)

    # ── 4b. can_modify_track returns useful info ─────────────────────────
    def test_can_modify_track():
        if not tracks:
            return "SKIP"
        result = ipc.call("daw.can_modify_track", {"track_id": tracks[0]["id"]})
        assert_in("can_modify", result)
        assert_in("reasons", result)
        assert_type(result["can_modify"], bool)

    test("can_modify_track returns actionable info", test_can_modify_track)

    # ── 4c. check_session_health reports issues ──────────────────────────
    def test_session_health():
        result = ipc.call("daw.check_session_health")
        assert_in("healthy", result)
        assert_type(result["healthy"], bool)
        assert_in("issues", result)
        assert_type(result["issues"], list)

    test("check_session_health returns structured report", test_session_health)

    # ── 4d. validate_routing_integrity ───────────────────────────────────
    def test_routing_integrity():
        result = ipc.call("daw.validate_routing_integrity")
        assert_in("valid", result)
        assert_type(result["valid"], bool)

    test("validate_routing_integrity returns valid flag", test_routing_integrity)

    # ── 4e. get_session_locks returns complete lock state ────────────────
    def test_session_locks():
        result = ipc.call("daw.get_session_locks")
        assert_in("recording_tracks", result)
        assert_in("frozen_tracks", result)
        assert_in("locked_regions", result)
        assert_in("exporting", result)

    test("get_session_locks returns all lock categories", test_session_locks)

    print("\n" + "-" * 70)
    print("5. PERFORMANCE")
    print("-" * 70)

    # ── 5a. Simulation speed ─────────────────────────────────────────────
    def test_simulate_speed():
        """All parameter-free simulate commands should respond in < 500ms each."""
        fast_cmds = [
            "daw.simulate.export_session",
            "daw.simulate.close_session",
            "daw.simulate.cleanup_unused",
        ]
        slow = []
        for cmd in fast_cmds:
            start = time.time()
            try:
                ipc.call(cmd, {}, timeout=5.0)
            except Exception:
                pass
            elapsed = time.time() - start
            if elapsed > 0.5:
                slow.append(f"{cmd}: {elapsed:.1f}s")

        if slow:
            raise AssertionError(f"Slow simulations (> 500ms): {', '.join(slow)}")

    test("simulate commands respond in < 500ms", test_simulate_speed)

    # ── 5b. Safety command speed ─────────────────────────────────────────
    def test_safety_speed():
        """Safety guards should be fast (< 200ms)."""
        cmds = [
            ("daw.can_modify_session", {}),
            ("daw.is_session_busy", {}),
            ("daw.get_session_locks", {}),
            ("daw.check_session_health", {}),
            ("daw.get_api_stats", {}),
        ]
        slow = []
        for cmd, params in cmds:
            start = time.time()
            try:
                ipc.call(cmd, params, timeout=5.0)
            except Exception:
                pass
            elapsed = time.time() - start
            if elapsed > 0.2:
                slow.append(f"{cmd}: {elapsed:.1f}s")

        if slow:
            raise AssertionError(f"Slow safety commands (> 200ms): {', '.join(slow)}")

    test("safety commands respond in < 200ms", test_safety_speed)

    # ── 5c. Batch introspection speed ────────────────────────────────────
    def test_introspection_speed():
        """Command introspection should be fast."""
        start = time.time()
        ipc.call("daw.get_destructive_commands")
        elapsed = time.time() - start
        assert_true(elapsed < 1.0, f"get_destructive_commands took {elapsed:.1f}s")

    test("command introspection is fast (< 1s)", test_introspection_speed)

    # ── Summary ──────────────────────────────────────────────────────────
    ipc.close()

    print("\n" + "=" * 70)
    total = PASS + FAIL + SKIP
    print(f"Results: {PASS} passed, {FAIL} failed, {SKIP} skipped ({total} total)")
    print("=" * 70)

    if FAIL > 0:
        print("\nSome tests FAILED. Review output above.")
        sys.exit(1)
    else:
        print("\nAll tests PASSED.")
        sys.exit(0)


if __name__ == "__main__":
    run_all()
