import Firehose     from "aws-sdk/clients/firehose"

import _log         from "../_log";
import DEF          from "../_global";

let FIREHOSE        = new Firehose();

const RECORDS: Firehose.PutRecordBatchRequestEntryList = [];
const KINESIS_STREAM_NAME: string = process.env.KINESIS_STREAM_NAME ||  "KINESIS_STREAM_LOGGER_0";




// upload data to Amazon Firehose every 5 second if data exists
setInterval(function() {
    if (!RECORDS.length) {
        return;
    }
    // upload data to Amazon Kinesis
    FIREHOSE.putRecordBatch ({
        Records: RECORDS,
        DeliveryStreamName: KINESIS_STREAM_NAME,
    }, function(err, data) {
        if (err) {
            console.error(err);
        }
    });
    // clear record data
    RECORDS.length = 0;
}, 5000);



let sendInFiveSeconds = function(m: string){
    RECORDS.push({
        Data: m
    });
}
let sendImmediate = function(m: string){
    return new Promise(function(resolve, reject){
        FIREHOSE.putRecord ({
            Record: {Data: m},
            DeliveryStreamName: KINESIS_STREAM_NAME,
        }, function(err, data) {
            if (err) {
                return reject(err);
            }
            
            return resolve(data);
        });
    });
}


export default {
    sendImmediate: sendImmediate,
    sendInFiveSeconds: sendInFiveSeconds
}




