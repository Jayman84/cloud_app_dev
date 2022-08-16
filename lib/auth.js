const jwt = require('jsonwebtoken');

const secretKey = 'SuperSecret';

/*
 * Generate JWT token
 */
function generateAuthToken(userID, userRole) {
	const payload = { 
		sub: userID,
		role: userRole
	};
	return jwt.sign(payload, secretKey, { expiresIn: '24h' });
}
exports.generateAuthToken = generateAuthToken;

/*
 * Provides credentials for a given request
 */
function requireAuthentication(req, res, next) {
	const authHeader = req.get('Authorization') || '';
	const authHeaderParts = authHeader.split(' ');
	const token = authHeaderParts[0] === 'Bearer' ? authHeaderParts[1] : null;
	
	try {
		const payload = jwt.verify(token, secretKey);
		req.user = payload.sub;
		req.role = payload.role;
		if(next) next();
	} catch (err) {
		console.log(err);
		res.status(401).json({
			error: "Invalid authentication token provided."
		});
	}
}
exports.requireAuthentication = requireAuthentication;