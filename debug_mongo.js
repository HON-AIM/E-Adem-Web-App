const MongoStore = require('connect-mongo');
console.log('Type of MongoStore:', typeof MongoStore);
console.log('MongoStore keys:', Object.keys(MongoStore));
if (MongoStore.default) {
    console.log('MongoStore.default keys:', Object.keys(MongoStore.default));
}
try {
    console.log('MongoStore.create is:', MongoStore.create);
} catch (e) {
    console.log('Error accessing create:', e);
}
