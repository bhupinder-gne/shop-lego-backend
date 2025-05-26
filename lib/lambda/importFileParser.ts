import { S3Event } from 'aws-lambda';
import * as AWS from 'aws-sdk';
const csvParser = require('csv-parser');

const s3 = new AWS.S3();

export const importFileParser = async (event: S3Event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    const params = {
      Bucket: bucket,
      Key: key,
    };

    const s3Stream = s3.getObject(params).createReadStream();

    await new Promise<void>((resolve, reject) => {
      interface CsvRecord {
        [key: string]: string;
      }

      s3Stream
        .pipe(csvParser())
        .on('data', (data: CsvRecord) => {
          console.log('Parsed record:', data);
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (err: Error) => {
          console.error('Stream error:', err);
          reject(err);
        });
    });
  }
};