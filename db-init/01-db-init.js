db.users.insertMany([
	{
		"name": "Cory Hayes",
		"email": "hayescor@oregonstate.edu",
		"role": "admin",
		"password": "$2a$08$Y2IHnr/PU9tzG5HKrHGJH.zH3HAvlR5i5puD5GZ1sHA/mVrHKci72"
	},
	{
		"name": "Cody Luth",
		"email": "luthco@oregonstate.edu",
		"role": "instructor",
		"password": "$2a$08$bAKRXPs6fUPhqjZy55TIeO1e.aXud4LD81awrYncaCKJoMsg/s0c."
	},
	{
		"name": "Christopher Jansen",
		"email": "jansench@oregonstate.edu",
		"role": "student",
		"password": "$2a$08$WvRkJm.bz3zoRnmA.aQZBewLopoe00nA4qbzbnLyS4eRbm2MFNkMO"
	}
])

db.courses.insertMany([
  {
    "subject": "CS",
    "number": 493,
    "title": "Cloud Application Development",
    "term": "sp19",
    "instructorId": "5"
  },
  {
    "subject": "ECE",
    "number": 375,
    "title": "Some Other Class",
    "term": "sp19",
    "instructorId": "5"
	},
	{
    "subject": "MTH",
    "number": 202,
    "title": "Super Advanced Hard Math Stuff",
    "term": "sp19",
    "instructorId": "4"
  }
])