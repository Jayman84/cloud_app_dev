const { ObjectId } = require('mongodb');
const { Parser } = require('json2csv');

const { getDBReference } = require('../lib/mongo');
const { extractValidFields } = require('../lib/validation');
const { getUserById } = require('./users');
const { insertCSV } = require('./csv');

const CourseSchema = {
  subject: { required: true },
  number: { required: true },
  title: { required: true },
  term: { required: true },
  instructorId: { required: true }
}
exports.CourseSchema = CourseSchema;

exports.getCoursesPage = async function getCoursesPage(page) {
  const db = getDBReference();
  const collection = db.collection('courses');
  const count = await collection.countDocuments();

  const pageSize = 10;
  const lastPage = Math.ceil(count / pageSize);
  page = page > lastPage ? lastPage : page;
  page = page < 1 ? 1 : page;
  const offset = (page - 1) * pageSize;

  const results = await collection.find({})
    .sort({ _id: 1 })
    .skip(offset)
    .limit(pageSize)
    .toArray();

  return {
    courses: results,
    page: page,
    totalPages: lastPage,
    pageSize: pageSize,
    count: count
  };
}

exports.insertNewCourse = async function insertNewCourse(course){
  course = extractValidFields(course, CourseSchema);
  const db = getDBReference();
  const collection = db.collection('courses');
  const result = await collection.insertOne(course);
  return result.insertedId;
}

exports.getCourseByID = async function getCourseByID(id){
  const db = getDBReference();
  const collection = db.collection('courses');
  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    // THIS NEEDS TO OMIT ENROLLMENTS AND ASSIGNMENTS -- IMPORTANT
    const results = await collection.find({ _id: new ObjectId(id) }).toArray();
    return results[0];
  }
}

exports.updateCourseByID = async function updateCourseByID(id, course){
  const db = getDBReference();
  const collection = db.collection('courses');
  if(!ObjectId.isValid(id)) {
    return null;
  } else {
    const result = await collection.replaceOne(
      { _id: new ObjectId(id) },
      course
    );
    return result.matchedCount > 0;
  }
}

exports.deleteCourseByID = async function deleteCourseByID(id){
  const db = getDBReference();
  const collection = db.collection('courses');
  if(!ObjectId.isValid(id)) {
    return null;
  } else {
    await removeCourseFromUsers(id);
    const courseResult = await collection.deleteOne(
      { _id: new ObjectId(id) }
    );
    return courseResult.deletedCount > 0;
  }
}

async function removeCourseFromUsers(courseId){
  const db = getDBReference();
  const collection = db.collection('users');
  const results = await collection.find({ enrollment: courseId }).project( {_id: 1} ).toArray();
  var count = 0;

  for(var i = 0; i < results.length; i++) {
    const user = await getUserById(results[i]._id, 0);
    if(user){
      const removed = await collection.updateOne( 
        { _id : results[i]._id },
        { $pull: { enrollment: courseId } }
      );
      count = count + removed.matchedCount;
    }
  }

  return count > 0;
}

exports.updateEnrollment = async function updateEnrollment(id, add, remove){
  const db = getDBReference();
  const collection = db.collection('users');
  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    var count = 0;

    if(add){
      for (var i = 0; i < add.length; i++){
        const results = await getUserById(add[i], 0);
        if(results){
          const added = await collection.updateOne(
            { _id: new ObjectId(add[i]) },
            { $addToSet: { enrollment: id } }
          );
          count = count + added.matchedCount;
        }
      }
    }

    if(remove){
      for (var i = 0; i < remove.length; i++){
        const results = await getUserById(remove[i], 0);
        if(results){
          const removed = await collection.updateOne( 
            { _id : new ObjectId(remove[i]) },
            { $pull: { enrollment: id } }
          );
          count = count + removed.matchedCount;
        }
      }
    }
    return count > 0;
  }
}

exports.getEnrollment = async function getEnrollment(id){
  const db = getDBReference();
  const collection = db.collection('users');
  var students = [];
  if(!ObjectId.isValid(id)) {
    return null;
  } else {
    const results = await collection.find({ enrollment: id }).project( {_id: 1} ).toArray();
    if(results) {
      for(var i = 0; i < results.length; i++) {
        students.push(results[i]._id);
      }
    }
    return students;
  }
}

exports.getCSV = async function getCSV(id){
  const db = getDBReference();
  const collection = db.collection('users');
  var students = [];
  if(!ObjectId.isValid(id)) {
    return null;
  } else {
    const results = await collection.find({ enrollment: id }).project( { _id: 1, name: 1, email: 1 } ).toArray();

    const fields = [ '_id', 'name', 'email' ];
    const opts = { fields };

    try {
      var csv;
      const parser = new Parser(opts);
      csv = parser.parse(results);
      // const csvID = await insertCSV(csv);
      return csv;
    } catch (err) {
      console.error(err);
      return null;
    }
  }
}

exports.getAssignmentsByCourseId = async function getAssignmentsByCourseId(id){
  const db = getDBReference();
  const collection = db.collection('assignments');
  var assignments = [];
  if(!ObjectId.isValid(id)) {
    return null;
  } else {
    const results = await collection.find({ courseId: id }).project( {_id: 1} ).toArray();
    if(results) {
      for(var i = 0; i < results.length; i++) {
        assignments.push(results[i]._id);
      }
    }
    return assignments;
  }
}