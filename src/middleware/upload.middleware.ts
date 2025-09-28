import multer from "multer";

/**
 * A custom file filter function for multer.
 * It checks the mimetype of the uploaded file to ensure it's an image.
 *
 * @param file - The file object provided by multer.
 * @param cb - The callback function to be called by the filter.
 */
const checkFileType = (
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Define allowed image file extensions
  const allowedFileTypes = /jpeg|jpg|png|gif|webp/;

  // Check the file's mimetype
  const isMimeTypeAllowed = allowedFileTypes.test(file.mimetype);

  if (isMimeTypeAllowed) {
    // If the file type is allowed, pass null for the error and true for success
    return cb(null, true);
  } else {
    // If not allowed, pass an error object
    cb(
      new Error(
        "Invalid file type. Only images (jpeg, jpg, png, gif, webp) are allowed."
      )
    );
  }
};

/**
 * Multer configuration.
 * - `storage`: We use memoryStorage to temporarily hold the file in memory as a Buffer.
 *   This is more efficient and scalable than saving to disk, especially for cloud deployments.
 * - `fileFilter`: Our custom function to validate the file type.
 * - `limits`: Sets a limit on the file size to prevent users from uploading overly large files.
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
  limits: {
    fileSize: 1024 * 1024 * 20, // 20 MB file size limit
    files: 10, // Allow up to 10 files per request
  },
});
