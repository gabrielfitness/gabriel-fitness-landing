// Inert HTML text: preserve punctuation and prevent closing tags/script injection.
exports.packageNotices = text => '<section id="third-party-notices" hidden><pre>' +
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;') +
  '</pre></section>';
