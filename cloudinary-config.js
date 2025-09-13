// cloudinary-config.js
export const CLOUDINARY = {
  cloudName: "awasia",
  uploadPreset: "awasia", // your unsigned preset (from your console)
  // folder: "products",   // optional: uncomment if you want to group assets
};

export const CLOUDINARY_UPLOAD_URL =
  `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`;
