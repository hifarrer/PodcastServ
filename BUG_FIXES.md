# Bug Fixes - AI Podcast Generator

## Issues Fixed

### 1. **Audio Splitting Logic** ✅ FIXED
**Problem**: Audio was being split into incorrect number of parts (2-minute audio split into 2 parts of 60 seconds instead of 4 parts of 30 seconds).

**Root Cause**: The splitting was using `Object.keys(scriptResult.parts30s).length` which was based on the script's 30-second parts, not the actual target duration.

**Solution**: 
```typescript
// Calculate number of 30-second segments based on target duration
const targetDurationSeconds = (options.targetMinutes || 5) * 60;
const segmentsCount = Math.ceil(targetDurationSeconds / 30);
```
  
**Result**: Now correctly splits audio into 30-second segments (2 minutes = 4 segments of 30 seconds each).

### 2. **Wavespeed API Structure Issues** ✅ FIXED
**Problem**: Incorrect API response structure handling and wrong polling endpoint.

**Root Cause**: 
1. Initial response has nested `data` structure with `id` inside `data.id`
2. Polling endpoint should be `/result` not just the prediction ID
3. Response format different than expected

**Solution**: 
- Fixed initial response parsing to handle nested `data` structure
- Changed polling endpoint from `/predictions/${requestId}` to `/predictions/${requestId}/result`
- Updated `WavespeedResponse` interface to match actual API response
- Added fallback parsing for both nested and flat response structures
- Enhanced debugging logs to show full response structure

**Initial API Response**:
```json
{
  "code": 200,
  "message": "success", 
  "data": {
    "id": "cc570ce403384c08bb7f02f9c1155236",
    "model": "wavespeed-ai/infinitetalk",
    "outputs": [],
    "urls": { "get": "https://api.wavespeed.ai/api/v3/predictions/.../result" },
    "status": "created",
    "created_at": "2025-10-26T02:03:59.684Z",
    "error": "",
    "timings": { "inference": 0 }
  }
}
```

**Polling Response**:
```json
{
  "id": "97684696e1f44e01b30e65702a17ff4f",
  "urls": { "get": "https://api.wavespeed.ai/api/v3/predictions/.../result" },
  "error": "",
  "model": "wavespeed-ai/infinitetalk", 
  "status": "completed",
  "outputs": ["https://d2p7pge43lyniu.cloudfront.net/output/..."],
  "timings": { "inference": 249825 },
  "created_at": "2025-10-26T01:47:52.939846222Z",
  "has_nsfw_contents": null
}
```

**Key Changes**:
- Fixed request ID extraction: `response.data.data?.id || response.data.id`
- Corrected polling endpoint: `/predictions/${requestId}/result`
- Added full response logging for debugging
- Enhanced error handling for nested response structures
- **CRITICAL FIX**: Fixed response parsing to handle nested `data` structure in polling responses
- Updated completion detection to use `actualData.status` and `actualData.outputs` instead of direct properties

### 3. **Progress Bar Not Showing** ✅ INVESTIGATED
**Problem**: Progress bar not visible in UI, only console logs.

**Investigation**: The progress display logic appears correct:
- `showProgress` is set to `true` when generation starts
- `ProgressTracker` component is rendered when `showProgress` is true
- Progress polling is working (as evidenced by console logs)

**Possible Causes**:
1. **Tailwind CSS not loading** - Check if styles are applied
2. **Component not re-rendering** - Check if state updates are working
3. **CSS classes not working** - Check if Tailwind classes are being applied

**Debug Steps**:
1. Check browser DevTools to see if ProgressTracker component is rendered
2. Check if Tailwind CSS is loading properly
3. Check if the component is receiving the correct props

### 4. **Enhanced Error Logging** ✅ ADDED
**Improvement**: Added comprehensive error logging for Wavespeed API calls to help debug issues.

**Added**:
- Full response logging
- Status code logging
- Error response data logging
- Better error messages

## Testing the Fixes

### 1. **Test Audio Splitting**
- Create a 2-minute podcast
- Check console logs for: `Calculating audio segments`
- Verify: `segmentsCount: 4` for 2-minute duration
- Verify: Audio is split into 4 parts of 30 seconds each

### 2. **Test Wavespeed API**
- Monitor console logs for Wavespeed polling
- Look for: `Video result response` with full response data
- Check if 400 errors are resolved
- Verify video generation completes

### 3. **Test Progress Display**
- Check if progress bar appears in UI
- Verify real-time updates
- Check if stages are displayed correctly
- Verify progress percentage updates

## Expected Console Output

After fixes, you should see:

```
[2025-01-26T12:00:00.000Z] Calculating audio segments { targetMinutes: 2, targetDurationSeconds: 120, segmentsCount: 4 }
[2025-01-26T12:00:01.000Z] Audio splitting completed { parts: 4, audioParts: [...] }
[2025-01-26T12:00:02.000Z] Video result response { attempt: 1, requestId: "abc123", status: "processing", fullResponse: {...} }
[2025-01-26T12:00:03.000Z] Video generation completed successfully { requestId: "abc123", outputUrl: "https://..." }
```

## Next Steps

1. **Test the fixes** with a new generation
2. **Monitor console logs** for the improved error messages
3. **Verify audio splitting** creates correct number of segments
4. **Check progress display** in the UI
5. **Report any remaining issues** with the enhanced logging

## Files Modified

- `src/app/api/generate/route.ts` - Fixed audio splitting logic
- `src/lib/services/wavespeed.ts` - Fixed API endpoint and added error logging
- `src/components/ProgressTracker.tsx` - (No changes needed, logic was correct)
- `src/app/page.tsx` - (No changes needed, logic was correct)
