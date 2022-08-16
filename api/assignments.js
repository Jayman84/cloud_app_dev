/*
 * API sub-router for assignments collection endpoints.
 */

const router = require('express').Router();
const multer = require('multer');
const crypto = require('crypto');
const { requireAuthentication } = require('../lib/auth');
const { validateAgainstSchema } = require('../lib/validation');
const {
  AssignmentSchema,
  getAssignmentById,
  insertNewAssignment,
  updateAssignmentById,
  deleteAssignmentById,
} = require('../models/assignment');
const {
  insertNewSubmission,
  removeUploadedFile,
  getPagedAssignmentSubmissions,
  getDownloadStreamByFilename,
  removeAllSubmissions
} = require('../models/submission');
const {
  getCourseByID
} = require('../models/course');
const {
  getUserById
} = require('../models/users');

const upload = multer({
  storage: multer.diskStorage({
    destination: `${__dirname}/uploads`,
    filename: (req, file, callback) => {
      console.log("file:" + JSON.stringify(file));
      const basename = crypto.pseudoRandomBytes(16).toString('hex');
      const extension = file.originalname.substr(file.originalname.lastIndexOf('.') + 1);
      callback(null, `${basename}.${extension}`);
    }
  })
});

/*
 * Route to create a new assignment.
 */
router.post('/', requireAuthentication, async (req, res) => {
  const course = await getCourseByID(req.body.courseId);
  //console.log(JSON.stringify(req.body));
  if (req.role == 'admin' || (req.role == 'instructor' && req.user == course.instructorId)) {
    if (validateAgainstSchema(req.body, AssignmentSchema)) {
      try {
        const id = await insertNewAssignment(req.body);
        res.status(201).send({
          id: id
        });
      } catch (err) {
        console.error(err);
        res.status(500).send({
          error: "Error inserting assignment into DB.  Please try again later."
        });
      }
    } else {
      res.status(400).send({
        error: "The request body was either not present or did not contain a valid Assignment object."
      });
    }
  }else{
    res.status(403).send({
      error: "Unauthorized."
    });
  }
});


/*
 * Route to fetch info about a specific assignment.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const assignment = await getAssignmentById(req.params.id);
    if (assignment) {
      res.status(200).send(assignment);
    } else {
      next();
    }
  } catch (err) {
    console.error(err);
    res.status(404).send({
      error: "Specified Assignment "+req.params.id+" not found."
    });
  }
});



/*
 * Route to update a specific assignment.
 */
router.put('/:id', requireAuthentication, async (req, res, next) => {
  const course = await getCourseByID(req.body.courseId);
  if (req.role == 'admin' || (req.role == 'instructor' && req.user == course.instructorId)) {
    if(validateAgainstSchema(req.body, AssignmentSchema)){
      try {
        const id = await updateAssignmentById(req.params.id, req.body);
        if(id != null){
          res.status(200).send({success: "Assignment: "+id+" updated"});
        }else{
          res.status(404).send({
            error: "Specified Assignment "+req.params.id+" not found."
          });
        }
      } catch (err) {
        console.error(" -- Error:", err);
        res.status(404).send({
          error: "Specified Assignment "+req.params.id+" not found."
        });
      }
    }else{
      res.status(403).send({
        error: "The request body was either not present or did not contain any fields related to Assignment objects."
      });
    }
  }else{
    res.status(403).send({
      error: "Unauthorized."
    });
  }
});

/*
 * Route to delete a specific assignment.
 */
router.delete('/:id', requireAuthentication, async (req, res, next) => {
  const assignment = await getAssignmentById(req.params.id);
  const course = await getCourseByID(assignment.courseId);
  if (req.role == 'admin' || (req.role == 'instructor' && req.user == course.instructorId)) {
    try {
      if(await getAssignmentById(req.params.id) != null){
        const subs = await removeAllSubmissions(req.params.id);
        const id = await deleteAssignmentById(req.params.id);
        res.status(204).end();
      }else{
        res.status(404).send({
          error: "Specified Assignment "+req.params.id+" not found"
        });
      }
    } catch (err) {
      console.error(" -- Error:", err);
      res.status(404).send({
        error: "Specified Assignment "+req.params.id+" not found"
      });
    }
  }else{
    res.status(403).send({
      error: "Unauthorized."
    });
  }
});






/*

***************************** SUBMISSION RELATED ROUTES BELOW

*/

/*
 * Route to create a new submission.
 */


router.post('/:id/submissions', requireAuthentication, upload.single('submission'), async (req, res) => {
  const student = await getUserById(req.user, 0);
  const assignment = await getAssignmentById(req.params.id);
  var studentEnrolled = false;
  if(student.enrollment){
    for (i=0; i < student.enrollment.length; i++) {
      if (student.enrollment[i] == assignment.courseId){
        studentEnrolled = true;
      }
    }
  }
  console.log("StudentEnrolled: " + studentEnrolled);
  if (req.role == 'student' && studentEnrolled == true) {
    try {
      const date = new Date();
      date.toISOString();
      const submission = {
        path: req.file.path,
        filename: req.file.filename,
        contentType: req.file.mimetype,
        assignmentId: req.params.id,
        studentId: req.user,
        timestamp: date
      };
      const id = await insertNewSubmission(submission);
      if(id == null){
        res.status(404).send({
          error: "Specified Assignment "+req.params.id+" not found."
        });
      }else{
        await removeUploadedFile(req.file);
        res.status(201).send({
          id: id,
        });
      }
    } catch (err) {
      console.error(err);
      res.status(404).send({
        error: "Specified Assignment "+req.params.id+" not found."
      });
    }
  }else{
    res.status(403).send({
      error: "Unauthorized."
    });
  }
});

/*
 * Route to get paginated submissions for an assignment.
 */
router.get('/:id/submissions', requireAuthentication, async (req, res, next) => {
  const assignment = await getAssignmentById(req.params.id);
  const course = await getCourseByID(assignment.courseId);
  if (req.role == 'admin' || (req.role == 'instructor' && req.user == course.instructorId)) {
    try {
      const submission = await getPagedAssignmentSubmissions(req.params.id, (parseInt(req.query.page) || 1));
      if(!submission.length == 0){
        res.status(201).send({
          submissions: submission
        });
      }else{
        res.status(404).send({
          error: "Specified Assignment "+req.params.id+" not found."
        });
      }
    } catch (err) {
      console.error(err);
      res.status(404).send({
        error: "Specified Assignment "+req.params.id+" not found."
      });
    }
  }else{
    res.status(403).send({
      error: "Unauthorized."
    });
  }
});

/*
 * Route to view / download submission.
 */
router.get('/files/:filename', (req, res, next) => {
  getDownloadStreamByFilename(req.params.filename)
    .on('error', (err) => {
      if (err.code === 'ENOENT') {
        next();
      } else {
        next(err);
      }
    })
    .on('file', (file) => {
      res.status(200).type(file.metadata.contentType);
    })
    .pipe(res);
});

module.exports = router;
