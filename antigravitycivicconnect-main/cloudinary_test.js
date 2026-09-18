import { v2 as cloudinary } from 'cloudinary';

// 1. Configure Cloudinary
cloudinary.config({ 
  cloud_name: 't2plu9dc', // ← replace this
  api_key: '368955827251188', // ← replace this
  api_secret: 'dCJvf48GPxcKCbUGtiYiSD93EFc' // ← replace this
});

async function run() {
  try {
    console.log("Starting Cloudinary test...");

    // 2. Upload an image
    console.log("Uploading sample image...");
    const uploadResult = await cloudinary.uploader.upload(
      'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      { public_id: 'onboarding_sample' }
    );
    console.log("Upload successful!");
    console.log("Secure URL:", uploadResult.secure_url);
    console.log("Public ID:", uploadResult.public_id);
    console.log("-------------------------");

    // 3. Get image details
    // The upload result already contains these details, but we can also use the api.resource method if strictly needed.
    // However, the upload response contains width, height, format, and bytes.
    console.log("Image Details:");
    console.log("Width:", uploadResult.width);
    console.log("Height:", uploadResult.height);
    console.log("Format:", uploadResult.format);
    console.log("File Size (bytes):", uploadResult.bytes);
    console.log("-------------------------");

    // 4. Transform the image
    // Generate a transformed URL using both f_auto and q_auto
    // f_auto: Automatically converts the image to the most efficient format based on the requesting browser.
    // q_auto: Automatically adjusts the compression quality to minimize file size without visible degradation.
    const transformedUrl = cloudinary.url('onboarding_sample', {
      fetch_format: 'auto',
      quality: 'auto'
    });

    console.log("Done! Click link below to see optimized version of the image. Check the size and the format.");
    console.log(transformedUrl);

  } catch (error) {
    console.error("An error occurred:", error);
  }
}

run();
