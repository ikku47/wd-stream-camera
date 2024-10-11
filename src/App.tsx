import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, Upload } from 'lucide-react';
import { KinesisClient, PutRecordCommand } from "@aws-sdk/client-kinesis";

function App() {
  const [isStreaming, setIsStreaming] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

  const startStreaming = useCallback(() => {
    setIsStreaming(true);
    mediaRecorderRef.current = new MediaRecorder(webcamRef.current!.stream as MediaStream);
    mediaRecorderRef.current.addEventListener('dataavailable', handleDataAvailable);
    mediaRecorderRef.current.start();
  }, [webcamRef, setIsStreaming]);

  const stopStreaming = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsStreaming(false);
  }, []);

  const handleDataAvailable = useCallback(
    ({ data }: BlobEvent) => {
      if (data.size > 0) {
        setRecordedChunks((prev) => prev.concat(data));
      }
    },
    [setRecordedChunks]
  );

  const handleUpload = useCallback(async () => {
    if (recordedChunks.length) {
      const blob = new Blob(recordedChunks, {
        type: 'video/webm',
      });
      
      const client = new KinesisClient({
        region: "YOUR_AWS_REGION",
        credentials: {
          accessKeyId: "YOUR_ACCESS_KEY_ID",
          secretAccessKey: "YOUR_SECRET_ACCESS_KEY",
        },
      });

      const reader = new FileReader();

      reader.onload = async (e) => {
        const base64data = e.target?.result as string;
        const command = new PutRecordCommand({
          Data: new TextEncoder().encode(base64data.split(',')[1]),
          PartitionKey: 'partition-1',
          StreamName: 'YOUR_KINESIS_STREAM_NAME',
        });

        try {
          const response = await client.send(command);
          console.log('Successfully uploaded to Kinesis:', response);
          alert('Stream uploaded successfully!');
        } catch (error) {
          console.error('Error uploading to Kinesis:', error);
          alert('Failed to upload stream. Check console for details.');
        }
      };

      reader.readAsDataURL(blob);
      setRecordedChunks([]);
    }
  }, [recordedChunks]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-8">Camera Stream to AWS Kinesis</h1>
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-md overflow-hidden">
        <Webcam
          audio={false}
          ref={webcamRef}
          className="w-full h-auto"
        />
        <div className="p-4 flex justify-between items-center">
          <button
            onClick={isStreaming ? stopStreaming : startStreaming}
            className={`px-4 py-2 rounded-md ${
              isStreaming
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600'
            } text-white flex items-center`}
          >
            <Camera className="mr-2" />
            {isStreaming ? 'Stop Streaming' : 'Start Streaming'}
          </button>
          <button
            onClick={handleUpload}
            disabled={recordedChunks.length === 0}
            className={`px-4 py-2 rounded-md ${
              recordedChunks.length === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white flex items-center`}
          >
            <Upload className="mr-2" />
            Upload to Kinesis
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;