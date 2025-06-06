#!/bin/bash
# mongodump mongodb://admin:J9PTvSiBMyesiPptBuLmAe5s@MongoS3601A.back4app.com:27017/92f257316e804046923050d7913d6637 -o ./mongobackup
# mongorestore mongodb://mongodbTest/parse  ./mongobackup/
parse-dashboard --dev --appId codebase --masterKey master_key --serverURL http://localhost:1337/parse --appName codebase &
parse-server ./config.json
