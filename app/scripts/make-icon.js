const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

function render(srcName, outName, width = 1024) {
  const svgPath = path.join(__dirname, '..', 'assets', srcName);
  const outPath = path.join(__dirname, '..', 'assets', outName);
  const svg = fs.readFileSync(svgPath, 'utf8');
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } });
  const png = resvg.render().asPng();
  fs.writeFileSync(outPath, png);
  console.log(`${outName}: ${png.length} bytes (${width}x${width})`);
}

// Main brand / iOS / splash / web icon (sunflower on dark bg)
render('icon.svg', 'icon.png', 1024);

// Android adaptive-icon foreground (transparent bg, scaled into safe zone)
render('adaptive-icon.svg', 'adaptive-icon.png', 1024);
