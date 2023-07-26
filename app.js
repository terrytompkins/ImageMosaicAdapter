const express = require('express');
const sharp = require('sharp');
const fs = require('fs/promises');
const path = require('path');

const app = express();
app.use(express.json());


// Split a large image into a grid of smaller images
  async function splitImageIntoGrid(sourceImage, numRows, numCols) {
    try {
      const image = sharp(sourceImage);
      const metadata = await image.metadata();
      const { width, height } = metadata;
  
      const cellWidth = Math.floor(width / numCols);
      const cellHeight = Math.floor(height / numRows);

      console.log(`Cell Width: ${cellWidth}, Cell Height: ${cellHeight}`);
    
      // console.log(`Source image dimensions: ${width}x${height}`);
      // console.log(`Cell dimensions: ${cellWidth}x${cellHeight}`);


      // Create the output directory if it doesn't exist
      const outputDir = 'images/out';
      /*
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
      }
      */
  
      // Split the image into smaller images
      for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
          const x = Math.floor(col * cellWidth);
          const y = Math.floor(row * cellHeight);
  
          console.log(`Row: ${row}, Col: ${col}, x: ${x}, y: ${y}, cellWidth: ${cellWidth}, cellHeight: ${cellHeight}`);

          const outputPath = path.join(outputDir, `image_${row}_${col}.jpg`);
          console.log(`Output path: ${outputPath}`);
          console.log(`Extracting cell at (${x}, ${y}) with width ${cellWidth} and height ${cellHeight}`);

          /*
          try {
            const extractedImage = image.extract({ left: x, top: y, width: cellWidth, height: cellHeight });
            const buffer = await extractedImage.toBuffer();
            // await fs.writeFile(outputPath, buffer);
            console.log(`Saved image_${row}_${col}.png`);
          } catch (error) {
            console.error('Error while extracting and saving image:', error);
          }
          */


          await sharp(sourceImage)
            .extract({ left: x, top: y, width: cellWidth, height: cellHeight })
            .toFile(outputPath);
          

        /*
          await image
          .extract({ left: x, top: y, width: cellWidth, height: cellHeight })
          .jpeg.toString('base64');
        */
        }
        
      }
  
      console.log(`Split ${sourceImage} into ${numRows} rows and ${numCols} columns.`);
    } catch (error) {
      console.error('Error while splitting the image:', error);
    }
  }


async function createMosaic(gridData) {
  const mosaicHeight = gridData.length;
  const mosaicWidth = gridData[0].length;

  // Find the largest image dimensions in the grid
  let maxWidth = 0;
  let maxHeight = 0;
  for (let row = 0; row < mosaicHeight; row++) {
    for (let col = 0; col < mosaicWidth; col++) {
      const imageFile = gridData[row][col];
      const { width, height } = await getImageDimensions(imageFile);
      maxWidth = Math.max(maxWidth, width);
      maxHeight = Math.max(maxHeight, height);
    }
  }

  // Create a blank canvas to draw the mosaic on
  const canvas = sharp({
    create: {
      width: mosaicWidth * maxWidth,
      height: mosaicHeight * maxHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  });

  // Draw each image onto the canvas at the correct position with padding
  for (let row = 0; row < mosaicHeight; row++) {
    for (let col = 0; col < mosaicWidth; col++) {
      const imageFile = gridData[row][col];
      const { width, height } = await getImageDimensions(imageFile);
      const xOffset = col * maxWidth + (maxWidth - width) / 2;
      const yOffset = row * maxHeight + (maxHeight - height) / 2;
      canvas.composite([{ input: imageFile, top: yOffset, left: xOffset }]);
    }
  }

  // Write the mosaic to a file
  await canvas.toFile('mosaic.png');
}

async function getImageDimensions(imageFilePath) {
  try {
    const metadata = await sharp(imageFilePath).metadata();
    return { width: metadata.width, height: metadata.height };
  } catch (error) {
    console.error('Error while getting image dimensions:', error);
    return { width: 0, height: 0 };
  }
}

// Endpoint to create a mosaic from the grid of images
app.post('/create-mosaic', async (req, res) => {
  const gridData = req.body;

  if (!Array.isArray(gridData) || gridData.some(row => !Array.isArray(row))) {
    res.status(400).send('Invalid grid data format. Please provide a structured representation of the grid.');
    return;
  }

  try {
    await createMosaic(gridData);
    res.send('Mosaic created.');
  } catch (error) {
    console.error('Error creating mosaic:', error);
    res.status(500).send('Error creating mosaic.');
  }
});

// Endpoint to split the large image into a grid
app.get('/split-image', async (req, res) => {
    const sourceImage = 'images/in/charger66_rgb.jpg';
    const numRows = 2;
    const numCols = 2;
  
    await splitImageIntoGrid(sourceImage, numRows, numCols);
  
    res.send('Image split into grid.');
  });


// Start the server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
