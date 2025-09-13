// cloudinary-config.js
export const CLOUDINARY = {
  cloudName: "awasia",
  uploadPreset: "dlwk13ady",
  folder: "products",
};

export const CLOUDINARY_UPLOAD_URL =
  `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`;
