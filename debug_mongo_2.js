const ConnectMongo = require('connect-mongo');
console.log('ConnectMongo keys:', Object.keys(ConnectMongo));
if (ConnectMongo.MongoStore) {
    console.log('ConnectMongo.MongoStore exists');
    console.log('ConnectMongo.MongoStore.create is:', ConnectMongo.MongoStore.create);
} else {
    console.log('ConnectMongo.MongoStore does not exist');
}
