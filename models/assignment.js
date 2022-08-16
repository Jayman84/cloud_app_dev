
const { ObjectId } = require('mongodb');
const { getDBReference } = require('../lib/mongo');
const { extractValidFields, validateAgainstSchema } = require('../lib/validation');

/*
 * Schema describing required/optional fields of an assignment object.
 */
const AssignmentSchema = {
  courseId: { required: true },
  title: { required: true },
  points: { required: true },
  due: { required: true }
};
exports.AssignmentSchema = AssignmentSchema;


/*
 * Executes a DB query to insert a new assignment into the database.  Returns
 * a Promise that resolves to the ID of the newly-created assignment entry.
 */
async function insertNewAssignment(assignment) {
  assignment = extractValidFields(assignment, AssignmentSchema);
  const db = getDBReference();
  const collection = db.collection('assignments');
  const result = await collection.insertOne(assignment);
  return result.insertedId;
}
exports.insertNewAssignment = insertNewAssignment;

/*
 * Executes a DB query to retrieve an assignment in the database.
 */
async function getAssignmentById(id) {
  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    const db = getDBReference();
    const collection = db.collection('assignments');
    const results = await collection
      .find({ _id: new ObjectId(id) })
      .toArray();
    return results[0];
  }
}
exports.getAssignmentById = getAssignmentById;


async function updateAssignmentById(id, body){
  if(validateAgainstSchema(body, AssignmentSchema)){
    if (!ObjectId.isValid(id)) {
      return null;
    }else{
      const db = getDBReference();
      const collection = db.collection('assignments');
      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set : {"courseId" : body.courseId, "title" : body.title, "points" : body.points, "due" : body.due} }
      );
      return id;
    }
  }else{
    return null;
  }
}
exports.updateAssignmentById = updateAssignmentById;


async function deleteAssignmentById(id){
  if (!ObjectId.isValid(id)) {
    return null;
  }else{
    const db = getDBReference();
    const collection = db.collection('assignments');
    const result = await collection.deleteOne(
      { _id: new ObjectId(id) }
    );
    return id;
  }
}
exports.deleteAssignmentById = deleteAssignmentById;
