const fs = require('fs');
let code = fs.readFileSync('google_apps_script.js', 'utf8');

code = code.replace(
  'var qrImgSrc = qrBase64 ? ("data:image/png;base64," + qrBase64) : (qrBlob ? "cid:synoraQrPass" : qrEndpoints[0]);',
  'var qrImgSrc = qrBlob ? "cid:synoraQrPass" : (qrBase64 ? ("data:image/png;base64," + qrBase64) : qrEndpoints[0]);'
);

fs.writeFileSync('google_apps_script.js', code);
console.log('Successfully fixed QR inline image source logic.');
