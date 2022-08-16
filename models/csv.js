const { ObjectId, GridFSBucket } = require('mongodb');
const fs = require('fs');
const { getDBReference } = require('../lib/mongo');
const multer = require('multer');


const upload = multer({
  storage: multer.diskStorage({
    destination: `${__dirname}/csv`,
    filename: 'tempfile.csv'
  })
});

exports.insertCSV = async function insertCSV(Csv) {
  upload.single(Csv);

  const db = getDBReference();
  const bucket = new GridFSBucket(db, { bucketName: 'csvs' });
  const uploadStream = bucket.openUploadStream(
      Csv.filename
  );
  fs.createReadStream('./')
  .pipe(uploadStream)
  .on('error', (err) => {
      reject(err);
  })
  .on('finish', (result) => {
      resolve(result._id);
  });
}

exports.downloadCSV = function downloadCSV(id) {
  const db = getDBReference();
  const bucket = new GridFSBucket(db, { bucketName: 'csvs' });
  if (!ObjectId.isValid(id)) {
      return null;
  } else {
      return bucket.openDownloadStream(new ObjectId(id));
  }
};