/*
 * User schema and data accessor methods.
 */

const {getDBReference} = require('../lib/mongo');
const {extractValidFields} = require('../lib/validation');
const bcrypt = require('bcryptjs');
const {ObjectId} = require('mongodb');

/*
 * Schema describing required/optional fields of a user object.
 */
const UserSchema = {
  name: {required: true},
  email: {required: true},
  role: {required: true},
  password: {required: true}
};
exports.UserSchema = UserSchema;

/*
 * Insert a new User into the DB.
 */
async function insertNewUser(user) {
	const userToInsert = extractValidFields(user, UserSchema);
	const db = getDBReference();
	const collection = db.collection('users');
	
	const passwordHash = await bcrypt.hash(userToInsert.password, 8);
	userToInsert.password = passwordHash;
	
	const result = await collection.insertOne(userToInsert);
	
	return result.insertedId;
}
exports.insertNewUser = insertNewUser;

/*
 * Get all user account info. !!DO NOT PUBLISH!!
 */
async function getAllUsers() {
	const db = getDBReference();
	const collection = db.collection('users');
	const results = await collection
		.find({})
		.toArray();

	return results;	
}
exports.getAllUsers = getAllUsers;

/*
 * Get user account data by ID. Exclude password unless 'includePassword' is true
 */
async function getUserById(id, includePassword) {
	const db = getDBReference();
	const collection = db.collection('users');
	
	if(!ObjectId.isValid(id)){
		return null;
	}else{
		const projection = includePassword ? {} : {password: 0};
		const results = await collection
			.find({_id: new ObjectId(id)})
			.project(projection)
			.toArray();

		return results[0];
	}
}
exports.getUserById = getUserById;

/*
 * Get courses offered by an instuctor. Belongs in models/courses.js. Move it when courses has been implemented
 */
async function getCoursesByInstructorId(id){
	const db = getDBReference();
	const collection = db.collection('courses');
	console.log("In getCoursesByInstructorId ---");
	if(!ObjectId.isValid(id)){
		return null;
	}else{
		console.log(id);
		const results = await collection
			.find({instructorId: id})
			.toArray();
		console.log(results);
		return results;
	}
}
exports.getCoursesByInstructorId = getCoursesByInstructorId;

/*
 * Get user account data by Email. Exclude password unless 'includePassword' is true
 */
async function getUserByEmail(email, includePassword) {
	const db = getDBReference();
	const collection = db.collection('users');
	const projection = includePassword ? {} : {password: 0};
	const results = await collection
		.find({email: email})
		.project(projection)
		.toArray();
			
	return results[0];
}
exports.getUserByEmail = getUserByEmail;

/*
 * Validate user with corresponding hashed 'password'
 * Returns user 'id' if valid, null if not
 */
async function validateUser(email, password) {
	const user = await getUserByEmail(email, true);
	
	if(user && await bcrypt.compare(password, user.password)){
		return user._id;
	} else {
		return null;
	}
}
exports.validateUser = validateUser;

