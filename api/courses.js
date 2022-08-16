const router = require('express').Router();

const { validateAgainstSchema } = require('../lib/validation');
const { requireAuthentication } = require('../lib/auth');
const {
    CourseSchema,
    getCoursesPage,
    insertNewCourse,
    getCourseByID,
    updateCourseByID,
    deleteCourseByID,
    updateEnrollment,
    getEnrollment,
    getCSV,
    getAssignmentsByCourseId
} = require('../models/course');
const { downloadCSV } = require('../models/csv');

/*
 * Route to get paginated list of Courses.
 */
router.get('/', async (req, res) => {
  try{
    const coursesPage = await getCoursesPage(parseInt(req.query.page) || 1);
    coursesPage.links = {};
    if (coursesPage.page < coursesPage.totalPages) {
      coursesPage.links.nextPage = `/courses?page=${coursesPage.page + 1}`;
      coursesPage.links.lastPage = `/courses?page=${coursesPage.totalPages}`;
    }
    if (coursesPage.page > 1) {
      coursesPage.links.prevPage = `/courses?page=${coursesPage.page - 1}`;
      coursesPage.links.firstPage = `/courses?page=1`;
    }
    res.status(200).send(coursesPage);
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: "Error fetching courses list.  Please try again later."
    });
  }
});

/*
 * Route to create a new course.
 */
router.post('/', requireAuthentication, async (req, res) => {
  if (validateAgainstSchema(req.body, CourseSchema)) {
    if (req.role == 'admin') {
	  try {
        const id = await insertNewCourse(req.body);
        res.status(201).send({
          id: id
        });
      } catch (err) {
        console.error(err);
        res.status(500).send({
          error: "Error adding Course. Try again later."
        });
      }
	} else {
	    res.status(403).send({
		  error: "Unauthorized."
		});
	}
  } else {
    console.error(err);
    res.status(400).send({
      error: "The request body was either not present or did not contain any fields related to Course objects."
    });
  }
});

/*
 * Route to get a single course by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const course = await getCourseByID(req.params.id);
    if(course){
      res.status(200).send(course);
    } else {
      next();
    }
  } catch (err) {
    console.error(err);
    res.status(404).send({
      error: "Specified Course " + req.params.id + " not found"
    });
  }
});

/*
 * Route to update a single course by ID
 */
router.put('/:id', requireAuthentication, async (req, res, next) => {
  if (validateAgainstSchema(req.body, CourseSchema)){
	try {
	  const course = await getCourseByID(req.params.id);
		
      if (req.role == 'admin' || (req.role == 'instructor' && course.instructorId == req.user)) {     // can update course if admin or instructor for course
        const results = await updateCourseByID(req.params.id, req.body);
        if(results) {
          res.status(200).send("Success");
        } else {
          next();
        }
	  } else {
	    res.status(403).send({
		  error: "Unauthorized."
		});
	  }
    } catch (err) {
      console.error(err);
      res.status(500).send({
        error: "Error updating Course " + req.params.id + ". Try again later."
      });
    }
  } else {
    res.status(400).send({
      error: "The request body was either not present or did not contain any fields related to Course objects."
    });
  }
});

/*
 * Route to Delete a single course by ID
 */
router.delete('/:id', requireAuthentication, async (req, res, next) =>  {
  if (req.role == 'admin') {
    try {
      const course = await deleteCourseByID(req.params.id);
      if(course){
        res.status(200).send("Success");
      } else {
        next();
      }
    } catch (err) {
      console.error(err);
      res.status(500).send({
        error: "Error deleting Course " + req.params.id + ". Try again later."
      });
    }
  } else {
    res.status(403).send({
	  error: "Unauthorized."
	});
  }
});

/*
 * Route to Update a classes Enrollment
 */ 
router.post('/:id/students', requireAuthentication, async (req, res, next) => {
  try {
    const course = await getCourseByID(req.params.id);
    if (req.role == 'admin' || (req.role == 'instructor' && course.instructorId == req.user)) {     // can update course enrollment if admin or instructor for course
        const results = await updateEnrollment(req.params.id, req.body.add, req.body.remove);
        if(results) {
          res.status(200).send("Success");
        } else {
          res.status(500).send({
            error: "Failed to update enrollment for Course " + req.params.id
          })
        }
    } else {
      res.status(403).send({
        error: "Unauthorized."
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: "Error updating enrollment for Course " + req.params.id + ". Try again later."
    });
  }
});

/*
 * Route to get a classes Enrollment
 */
router.get('/:id/students', requireAuthentication, async (req, res, next) => {
  try {
	const course = await getCourseByID(req.params.id);
	
	if (req.role == 'admin' || (req.role == 'instructor' && course.instructorId == req.user)) {     // can get course enrollment if admin or instructor for course
      const results = await getEnrollment(req.params.id);
      if(results){
        res.status(200).send(results);
      } else {
        next();
      }
	} else {
	  res.status(403).send({
	    error: "Unauthorized."
	  });
	}
  } catch (err) {
    console.error(err);
    res.status(404).send({
      error: "Specified Course " + req.params.id + " not found"
    });
  }
});

router.get('/:id/roster', requireAuthentication, async (req, res, next) => {
  try {
    const course = await getCourseByID(req.params.id);
    
    if (req.role == 'admin' || (req.role == 'instructor' && course.instructorId == req.user)) {     // can get course enrollment.csv if admin or instructor for course
      const results = await getCSV(req.params.id);
      if (results) {
        // downloadCSV(results)
        // .on('error', (err) => {
        //   if (err.code === 'ENOENT') {
        //     next();
        //   } else {
        //     next(err);
        //   }
        // })
        // .on('file', (file) => {
        //   res.status(200).type('text/csv');
        // })
        // .pipe(res);

        res.setHeader('Content-disposition', 'attachment; filename=enrollment.csv');
        res.set('Content-Type', 'text/csv');
        res.status(200).send(results);
      } else {
        next();
      }
    } else {
      res.status(403).send({
        error: "Unauthorized."
      });
    }
  } catch (err) {
    console.error(err);
    res.status(404).send({
      error: "Specified Course " + req.params.id + " not found"
    });
  }
});

router.get('/:id/assignments', async (req, res, next) => {
  try{
    const results = await getAssignmentsByCourseId(req.params.id);
    if(results){
      res.status(200).send(results);
    } else {
      next();
    }  
  } catch (err) {
    console.error(err);
    res.status(404).send({
      error: "Specified Course " + req.params.id + " not found"
    });
  }
});

module.exports = router;

