
const { ObjectId, GridFSBucket } = require('mongodb');
const fs = require('fs');
const { getDBReference } = require('../lib/mongo');
const { extractValidFields } = require('../lib/validation');

/*
 * Schema describing required/optional fields of a submission object.
 */
const SubmissionSchema = {
    assignmentId: { required: true }
};
exports.SubmissionSchema = SubmissionSchema;


/*
 * retrieves all submissions for a given assignment
 */
async function getAllAssignmentSubmissions(id) {
    const db = getDBReference();
    const bucket = new GridFSBucket(db, { bucketName: 'submissions' });
    const results = bucket.find({ "metadata.assignmentId": id }).toArray();
    return results;
}
exports.getAllAssignmentSubmissions = getAllAssignmentSubmissions;


/*
 * retrieves a page of submissions for a given assignment
 */
async function getPagedAssignmentSubmissions(id, page) {
    if (!ObjectId.isValid(id)) {
        return null;
    } else {
        const results = await getAllAssignmentSubmissions(id);
        console.log(results);
        if(results.length < (page-1)*10){
            page = 1;
        }
        var returns = results.slice((page-1)*10, (page*10));
        var submissionReturns = []
        returns.forEach(function(element) {
            submissionReturns.push(element.metadata);
        });
        return submissionReturns;
    }
    
}
exports.getPagedAssignmentSubmissions = getPagedAssignmentSubmissions;


/*
 * Executes a DB query to insert a new submission into the database.  Returns
 * a Promise that resolves to the ID of the newly-created submission entry.
 */
async function insertNewSubmission(submission) {
    if (!ObjectId.isValid(submission.assignmentId)) {
        return null;
    }else{
        return new Promise((resolve, reject) => {
            const db = getDBReference();
            const bucket = new GridFSBucket(db, { bucketName: 'submissions' });
            const metadata = {
                assignmentId: submission.assignmentId,
                studentId: submission.studentId,
                timestamp: submission.timestamp,
                file:"/assignments/files/"+submission.filename,
                contentType: submission.contentType
            };
            const uploadStream = bucket.openUploadStream(
                submission.filename,
                { metadata: metadata }
            );
            fs.createReadStream(submission.path)
            .pipe(uploadStream)
            .on('error', (err) => {
                reject(err);
            })
            .on('finish', (result) => {
                resolve(result._id);
            });
        });
    }
}
exports.insertNewSubmission = insertNewSubmission;


/*
 * finds a single submission by ID
 */
async function getSubmissionById(id) {
    const db = getDBReference();
    const bucket = new GridFSBucket(db, { bucketName: 'submissions' });
    if (!ObjectId.isValid(id)) {
        return null;
    } else {
        const results = await bucket.find({ _id: new ObjectId(id) })
        .toArray();
        return results[0];
    }
}
exports.getSubmissionById = getSubmissionById;



async function removeUploadedFile(file) {
    return new Promise((resolve, reject) => {
        fs.unlink(file.path, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}
exports.removeUploadedFile = removeUploadedFile;


function getDownloadStreamById(id) {
    const db = getDBReference();
    const bucket = new GridFSBucket(db, { bucketName: 'submissions' });
    if (!ObjectId.isValid(id)) {
        return null;
    } else {
        return bucket.openDownloadStream(new ObjectId(id));
    }
};
exports.getDownloadStreamById = getDownloadStreamById;


function removeFileById(id) {
    const db = getDBReference();
    const bucket = new GridFSBucket(db, { bucketName: 'submissions' });
    if (!ObjectId.isValid(id)) {
        return null;
    } else {
        console.log("Deleting Submission ID: "+id);
        return bucket.delete(id);
    }
};
exports.removeFileById = removeFileById;

async function removeAllSubmissions(id) {
    if (!ObjectId.isValid(id)) {
        return null;
    } else {
        const submissions = await getAllAssignmentSubmissions(id);
        submissions.forEach(function(element) {
            removeFileById(element._id);
        });
        return true;
    }
};
exports.removeAllSubmissions = removeAllSubmissions;


function getDownloadStreamByFilename(filename) {
    const db = getDBReference();
    const bucket = new GridFSBucket(db, { bucketName: 'submissions' });
    return bucket.openDownloadStreamByName(filename);
};
exports.getDownloadStreamByFilename = getDownloadStreamByFilename;

