# DAW-178 RMS Two-Tone Waveform — Recovery Notes

**Date:** 2026-04-18. These changes were implemented, working, and then reverted via `git checkout HEAD --` during a cleanup. Preserving here so a future session can restore without re-deriving.

**Linear ticket:** DAW-178 (In Progress, Audio Clips in Arranger project)

## What it does

Renders audio waveforms in two tones: outer **peak envelope** (darker shade of track color) and inner **RMS body** (brighter shade) — so loud sections show the Cubase-style scribble-texture where transients stand out against the dense body, rather than a flat wall.

Needs the `rms` field on `PeakData`. Peak files auto-rebuild on first open because their on-disk size changes from 8 bytes/aggregate to 12 bytes/aggregate, which trips the existing "file too small" rebuild trigger — no version bump, no migration code.

## Files changed, in order

### 1. `libs/ardour/ardour/types.h`

Add `rms` to `PeakData`. Default-initialize all three fields so paths that don't explicitly write `rms` don't leak garbage through `memcpy`/mmap to disk.

```cpp
struct PeakData {
    typedef Sample PeakDatum;

    /* DAW-178: default-init so RMS (and min/max) is never read uninitialized
     * along the downsample/upsample/leftover paths in AudioSource that don't
     * explicitly compute it. Keeps PeakData trivially-copyable for
     * write()/mmap/memcpy used when loading/saving .peak files. Older peak
     * files that predate the rms field trigger auto-rebuild via the
     * file-size-mismatch path in AudioSource — no version bump needed. */
    PeakDatum min = 0.f;
    PeakDatum max = 0.f;
    PeakDatum rms = 0.f;
};
```

### 2. `libs/ardour/audiosource.cc` — compute RMS in peak build

In `AudioSource::compute_and_write_peaks`, right after the `find_peaks` call inside the peak-build loop:

```cpp
ARDOUR::find_peaks (buf+1, this_time-1, &peakbuf[peaks_computed].min, &peakbuf[peaks_computed].max);

/* DAW-178: fuse RMS calc into the same aggregate window. Scalar
 * loop here — find_peaks has per-arch SIMD variants we don't
 * touch; peak-build runs off the audio thread so the extra
 * cost is fine. */
double sum_sq = 0.0;
for (samplecnt_t s = 0; s < this_time; ++s) {
    const double v = (double) buf[s];
    sum_sq += v * v;
}
peakbuf[peaks_computed].rms = (this_time > 0) ? (float) sqrt (sum_sq / (double) this_time) : 0.f;

peaks_computed++;
```

### 3. `libs/ardour/audiosource.cc` — RMS aggregation in downsample path

In `read_peaks_with_fpp`, inside the `if (scale > 1.0)` downsample block, extend the inner aggregation loop:

```cpp
while (nvisual_peaks < read_npeaks) {

    xmax = -1.0;
    xmin = 1.0;
    /* DAW-178: aggregate RMS across stored peaks.
     * Correct combination for RMS over equal-size
     * sub-windows is sqrt(mean(rms_i^2)); accumulate
     * sum-of-squares and sqrt at emission. */
    double rms_sum_sq = 0.0;
    uint32_t rms_count = 0;

    while ((current_stored_peak <= stored_peak_before_next_visual_peak) && (i < chunksize)) {

        xmax = max (xmax, staging[i].max);
        xmin = min (xmin, staging[i].min);
        rms_sum_sq += (double) staging[i].rms * (double) staging[i].rms;
        ++rms_count;
        ++i;
        ++current_stored_peak;
    }

    peak_cache[nvisual_peaks].max = xmax;
    peak_cache[nvisual_peaks].min = xmin;
    peak_cache[nvisual_peaks].rms = (rms_count > 0) ? (float) sqrt (rms_sum_sq / (double) rms_count) : 0.f;
    ++nvisual_peaks;
    next_visual_peak_sample = min ((double) start + cnt, (next_visual_peak_sample + samples_per_visual_peak));
    stored_peak_before_next_visual_peak = (uint32_t) next_visual_peak_sample / samples_per_file_peak;
}
```

### 4. `libs/ardour/audiosource.cc` — RMS computation in upsample path

In `read_peaks_with_fpp`, inside the `else` (upsample) block that reads raw audio on the fly:

```cpp
xmin = 1.0;
xmax = -1.0;
/* DAW-178: RMS accumulator for on-the-fly (upsample) peak generation. */
double rms_sum_sq = 0.0;
uint32_t rms_count = 0;

while (nvisual_peaks < read_npeaks) {

    // ... (existing to_read / read_unlocked plumbing unchanged) ...

    const Sample s = raw_staging[i];
    xmax = max (xmax, s);
    xmin = min (xmin, s);
    rms_sum_sq += (double) s * (double) s;
    ++rms_count;
    ++i;
    ++current_sample;
    pixel_pos += pixels_per_sample;

    if (pixel_pos >= next_pixel_pos) {
        peaks[nvisual_peaks].max = xmax;
        peaks[nvisual_peaks].min = xmin;
        peaks[nvisual_peaks].rms = (rms_count > 0) ? (float) sqrt (rms_sum_sq / (double) rms_count) : 0.f;
        ++nvisual_peaks;
        xmin = 1.0;
        xmax = -1.0;
        rms_sum_sq = 0.0;
        rms_count = 0;

        next_pixel_pos = ceil (pixel_pos + 0.5);
    }
}
```

### 5. `libs/ardour/audioregion.cc` — scale RMS by region amplitude

In `AudioRegion::read_peaks`, extend the amplitude-scaling loops. RMS is always non-negative; negative scale_amplitude only flips min/max (already handled) but rms just scales by absolute value.

```cpp
if (_scale_amplitude < 0.f) {
    const float abs_amp = -_scale_amplitude;
    for (samplecnt_t n = 0; n < npeaks; ++n) {
        const float tmp = buf[n].max;
        buf[n].max = _scale_amplitude * buf[n].min;
        buf[n].min = _scale_amplitude * tmp;
        buf[n].rms *= abs_amp;
    }
} else if (_scale_amplitude != 1.0f) {
    for (samplecnt_t n = 0; n < npeaks; ++n) {
        buf[n].max *= _scale_amplitude;
        buf[n].min *= _scale_amplitude;
        buf[n].rms *= _scale_amplitude;
    }
}
```

### 6. `libs/waveview/waveview/wave_view.h` — LineTips + set_rms_color decl

Extend `LineTips`:

```cpp
struct LineTips {
    double top;
    double bot;
    double spread;
    /* DAW-178: RMS inner-body top/bot for two-tone rendering. */
    double rms_top;
    double rms_bot;
    bool clip_max;
    bool clip_min;

    LineTips () : top (0.0), bot (0.0), spread (0.0), rms_top (0.0), rms_bot (0.0), clip_max (false), clip_min (false) {}
};
```

Add public setter alongside the other color setters:

```cpp
void set_zero_color (Gtkmm2ext::Color);
void set_clip_color (Gtkmm2ext::Color);
/* DAW-178: inner RMS body color for two-tone waveform rendering. */
void set_rms_color (Gtkmm2ext::Color);
```

### 7. `libs/waveview/waveview/wave_view_private.h` — rms_color field + is_equivalent

Add a field next to the other color fields:

```cpp
Gtkmm2ext::Color      fill_color;
Gtkmm2ext::Color      outline_color;
Gtkmm2ext::Color      zero_color;
Gtkmm2ext::Color      clip_color;
/* DAW-178: inner RMS body color (brighter shade of fill for two-tone). */
Gtkmm2ext::Color      rms_color;
```

Extend `is_equivalent` so the cache correctly invalidates when rms_color changes:

```cpp
bool is_equivalent (WaveViewProperties const& other)
{
    return (samples_per_pixel == other.samples_per_pixel &&
            contains (other.sample_start, other.sample_end) && channel == other.channel &&
            height == other.height && amplitude == other.amplitude &&
            amplitude_above_axis == other.amplitude_above_axis && fill_color == other.fill_color &&
            outline_color == other.outline_color && zero_color == other.zero_color &&
            clip_color == other.clip_color && rms_color == other.rms_color &&
            show_zero == other.show_zero &&
            logscaled == other.logscaled && shape == other.shape &&
            gradient_depth == other.gradient_depth);
}
```

### 8. `libs/waveview/wave_view_private.cc` — ctor init + lookup check

In `WaveViewProperties::WaveViewProperties` ctor:

```cpp
, fill_color (0x000000ff)
, outline_color (0xff0000ff)
, zero_color (0xff0000ff)
, clip_color (0xff0000ff)
, rms_color (0x000000ff)
```

In `WaveViewCacheGroup::lookup_best_available_image`, add next to the other color checks:

```cpp
if (ip.clip_color != requested.clip_color) continue;
if (ip.rms_color != requested.rms_color) continue;
```

### 9. `libs/waveview/wave_view.cc` — mask, context, polygon, composite

Extend `ImageSet`:

```cpp
struct ImageSet {
    Cairo::RefPtr<Cairo::ImageSurface> wave;
    Cairo::RefPtr<Cairo::ImageSurface> outline;
    Cairo::RefPtr<Cairo::ImageSurface> clip;
    Cairo::RefPtr<Cairo::ImageSurface> zero;
    /* DAW-178: inner RMS body mask (two-tone waveform rendering). */
    Cairo::RefPtr<Cairo::ImageSurface> rms;

    ImageSet() :
        wave (0), outline (0), clip (0), zero (0), rms (0) {}
};
```

At the top of `WaveView::draw_image`, allocate the rms surface + context:

```cpp
images.rms = Cairo::ImageSurface::create (Cairo::FORMAT_A8, n_peaks, height);
// ... after the other context declarations:
Cairo::RefPtr<Cairo::Context> rms_context = Cairo::Context::create (images.rms);
```

Set its alpha source:

```cpp
set_source_rgba (rms_context, alpha_one);
```

In the `Normal` (non-rectified) branch, add RMS y-coord math. Declare the center/half constants, then populate `tips[i].rms_top/rms_bot` alongside the existing `compute_tips` calls. For the **logscaled** path:

```cpp
} else {
    const int y_span = 2 * floor ((height - 1) * .5);
    /* DAW-178: RMS body amplitude is scaled the same way the outer
     * envelope is (log or linear) and then converted to y-coords
     * symmetric around the centerline. */
    const double half = floor (0.5 * y_span);
    const double center = half;

    if (logscaled) {
        for (int i = 0; i < n_peaks; ++i) {
            // ... existing log-scaled p.max / p.min logic ...
            compute_tips (p, tips[i], y_span);
            tips[i].spread = tips[i].bot - tips[i].top;

            double r = peaks[i].rms;
            if (r > 0.0) {
                r = alt_log_meter (fast_coefficient_to_dB (r));
            }
            const double r_off = r * half;
            tips[i].rms_top = center - r_off;
            tips[i].rms_bot = center + r_off;
        }
    } else {
        for (int i = 0; i < n_peaks; ++i) {
            // ... existing non-logscaled clip_max/clip_min + compute_tips ...
            compute_tips (peaks[i], tips[i], y_span);
            tips[i].spread = tips[i].bot - tips[i].top;

            const double r_off = peaks[i].rms * half;
            tips[i].rms_top = center - r_off;
            tips[i].rms_bot = center + r_off;
        }
    }
}
```

Add the smoothing pass for RMS, right after the existing top/bot smoothing passes:

```cpp
smooth3_field (&LineTips::top, tmp.get ());
smooth3_array (tmp.get (), stop.get ());
smooth3_field (&LineTips::bot, tmp.get ());
smooth3_array (tmp.get (), sbot.get ());

/* DAW-178: Same two-pass smoothing for the RMS inner body. */
std::unique_ptr<double[]> srms_top (new double[n_peaks]);
std::unique_ptr<double[]> srms_bot (new double[n_peaks]);
smooth3_field (&LineTips::rms_top, tmp.get ());
smooth3_array (tmp.get (), srms_top.get ());
smooth3_field (&LineTips::rms_bot, tmp.get ());
smooth3_array (tmp.get (), srms_bot.get ());
```

Draw the inner RMS polygon into the rms mask (right after the outer wave polygon fill, before the outline strokes):

```cpp
/* ---- DAW-178: Inner RMS body into rms mask -------------------- */

rms_context->move_to (0.0, srms_top[0]);
for (int i = 1; i < n_peaks; ++i) {
    rms_context->line_to ((double) i, srms_top[i]);
}
for (int i = n_peaks - 1; i >= 0; --i) {
    rms_context->line_to ((double) i, srms_bot[i]);
}
rms_context->close_path ();
rms_context->fill ();
```

Composite it with `rms_color` over the wave mask, before the outline composite:

```cpp
context->mask (images.wave, 0, 0);
context->fill ();

/* DAW-178: Inner RMS body layered on top of the darker outer envelope.
 * Without this second pass the wave reads as a single-color block; with
 * it, loud sections show the Cubase-style two-tone where transients
 * stand out against the denser RMS body. */
set_source_rgba (context, req->image->props.rms_color);
context->mask (images.rms, 0, 0);
context->fill ();

set_source_rgba (context, req->image->props.outline_color);
context->mask (images.outline, 0, 0);
context->fill ();
```

Implement `set_rms_color` alongside the other setters:

```cpp
void
WaveView::set_rms_color (Color c)
{
    if (_props->rms_color != c) {
        begin_visual_change ();
        _props->rms_color = c;
        end_visual_change ();
    }
}
```

### 10. `gtk2_ardour/audio_region_view.cc` — derive rms color and push

In `AudioRegionView::set_some_waveform_colors`, after computing `fill` and `outline`:

```cpp
/* DAW-178: Inner RMS body — brighter shade of whatever `fill` ended
 * up being, so the two-tone effect persists through selected/
 * deselected/rec states. Interpolating toward white (rather than
 * toward fill_color at full brightness) keeps the hue family and
 * avoids fighting with the selection color. */
Gtkmm2ext::Color rms = UINT_INTERPOLATE (fill, 0xffffffff, 0.35);
```

Extend the alpha-adjustment branches to include rms:

```cpp
if (_dragging) {
    outline = UINT_RGBA_CHANGE_A(outline, 0xC0);
    fill = UINT_RGBA_CHANGE_A(fill, 0xC0);
    rms = UINT_RGBA_CHANGE_A(rms, 0xC0);
} else if (_region->muted()) {
    outline = UINT_RGBA_CHANGE_A(outline, 0x50);
    fill = UINT_RGBA_CHANGE_A(fill, 0x50);
    rms = UINT_RGBA_CHANGE_A(rms, 0x50);
} else {
    /* Normal and selected: fully opaque */
    outline = UINT_RGBA_CHANGE_A(outline, 0xff);
    fill = UINT_RGBA_CHANGE_A(fill, 0xff);
    rms = UINT_RGBA_CHANGE_A(rms, 0xff);
}

/* recorded region, override to red */
if (_recregion) {
    outline = UIConfiguration::instance().color ("recording waveform outline");
    fill = UIConfiguration::instance().color ("recording waveform fill");
    rms = UINT_INTERPOLATE (fill, 0xffffffff, 0.35);
}

for (vector<ArdourWaveView::WaveView*>::iterator w = waves_to_color.begin(); w != waves_to_color.end(); ++w) {
    (*w)->set_fill_color (fill);
    (*w)->set_outline_color (outline);
    (*w)->set_clip_color (clip);
    (*w)->set_zero_color (zero);
    (*w)->set_rms_color (rms);
}
```

## Known issues with this implementation

Observed with Linear waveform scale active: at quiet sections the RMS values are tiny (sqrt of very small squared values), so `rms_top`/`rms_bot` collapse to ≈ centerline, producing a thin squiggly line through the middle of the clip body. That was what the user flagged as "weird squiggly line" that prompted the full revert.

Ways to address in a re-apply:

1. Clamp minimum visible rms extent to some small pixel width (e.g. `max(r_off, 0.5)`) so it never collapses to a hairline.
2. Gate the rms polygon draw on `tips[i].spread > some_threshold` — skip the body in sections where the envelope itself is narrow.
3. Ship behind a user preference (DAW-179) so it's off by default and opt-in.

Option 3 is probably the right call — it's DAW-179, already filed.

## Build / test notes

- Builds cleanly against the rest of the tree.
- Peak files auto-rebuild on first open (file size goes from `N*8` to `N*12` bytes → existing "too short" detection triggers rebuild). One-time cost on session open.
- No performance regression at steady-state zoom — RMS draw is one extra polygon + mask composite per waveview image render, amortized by the existing cache.
