// Next 15.5's App Router Edge template hardcodes streaming metadata, ignoring htmlLimitedBots.
// Honor the same config in its generated entry without changing Next files or client navigation.
module.exports = function fixEdgeMetadata(source) {
  const flag = /serveStreamingMetadata:\s*true/g;
  if ((source.match(flag) || []).length !== 1) {
    throw new Error('Next.js Edge metadata template changed; review the blocking metadata workaround.');
  }
  return source.replace(flag,
    "serveStreamingMetadata: nextConfig.htmlLimitedBots ? !new RegExp(nextConfig.htmlLimitedBots, 'i').test(req.headers.get('user-agent') || '') : true");
};
