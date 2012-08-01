package com.example.helloandroid;

import android.annotation.SuppressLint;
import android.annotation.TargetApi;
import android.app.ActionBar;
import android.app.Activity;
import android.content.Intent;
import android.hardware.Camera;
import android.media.CamcorderProfile;
import android.media.MediaRecorder;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.util.Log;
import android.view.Menu;
import android.view.View;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.Toast;

public class MainActivity extends Activity {

    public static final String EXTRA_MESSAGE = "com.example.helloandroid.MESSAGE";
    public static final int ACTION_CAPTURE_VIDEO = 1;

    public static final String TAG = MainActivity.class.getSimpleName();

    private MediaRecorder recorder;
    private Camera camera;
    private CameraPreview cameraPreview;

    @SuppressLint("NewApi")
    @Override
    public void onCreate(Bundle savedInstanceState) {
	super.onCreate(savedInstanceState);
	setContentView(R.layout.activity_main);

	// Make sure we're running on Honeycomb or higher to use ActionBar APIs
	if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.HONEYCOMB) {
	    // For the main activity, make sure the app icon in the action bar
	    // does not behave as a button
	    ActionBar actionBar = getActionBar();
	    actionBar.setHomeButtonEnabled(false);
	}
    }

    @Override
    public void onDestroy() {
	super.onDestroy(); // Always call the superclass

	// Stop method tracing that the activity started during onCreate()
	android.os.Debug.stopMethodTracing();
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
	getMenuInflater().inflate(R.menu.activity_main, menu);
	return true;
    }

    public void sendMessage(View view) {
	EditText editText = (EditText) findViewById(R.id.edit_message);
	String message = editText.getText().toString();
	Log.i("Bla", "sendMessage(): " + message);
	Intent intent = new Intent(this, DisplayMessageActivity.class);
	intent.putExtra(EXTRA_MESSAGE, message);
	startActivity(intent);
    }

    @TargetApi(14)
    @Override
    protected void onResume() {
	super.onResume();

	camera = Camera.open();
	cameraPreview = new CameraPreview(this, camera);
	FrameLayout previewFrameLayout = (FrameLayout) findViewById(R.id.camera_preview);
	previewFrameLayout.addView(cameraPreview);
	camera.getParameters().setRecordingHint(true);
    }

    @Override
    protected void onPause() {
	super.onPause();

	try {
	    if (camera != null) {
		camera.stopPreview();
		camera.setPreviewDisplay(null);
		camera.release();
		camera = null;
	    }
	} catch (Exception e) {
	    Log.e(TAG, e.getMessage());
	    e.printStackTrace();
	}
    }

    public void startRecording(View view) {
	try {
	    if (!Utils.isIntentAvailable(this, MediaStore.ACTION_VIDEO_CAPTURE)) {
		Toast.makeText(this, "No camera available", Toast.LENGTH_SHORT).show();
		return;
	    }

	    camera.unlock();
	    recorder = new MediaRecorder();
	    recorder.setCamera(camera);

	    recorder.setAudioSource(MediaRecorder.AudioSource.MIC);
	    recorder.setVideoSource(MediaRecorder.VideoSource.CAMERA);

	    recorder.setProfile(CamcorderProfile.get(CamcorderProfile.QUALITY_480P));
	    // no need to set setOutputFormat, setAudioEncoder, setVideoEncoder
	    // when I set the profile instead?

	    recorder.setOutputFile(Utils.getOutputMediaFilePath(Utils.MEDIA_TYPE_VIDEO));

	    recorder.setPreviewDisplay(cameraPreview.getHolder().getSurface());

	    recorder.prepare();
	    recorder.start();

	    Log.i(TAG, "Recording started");

	} catch (Exception e) {
	    releaseMediaRecorder();
	    Log.e(TAG, e.getMessage());
	    e.printStackTrace();
	}
    }

    public void stopRecording(View view) {
	if (recorder != null) {
	    recorder.stop();
	    releaseMediaRecorder();
	    camera.lock();
	}

	Log.i(TAG, "Recording stopped");
    }

    private void releaseMediaRecorder() {
	if (recorder != null) {
	    recorder.reset();
	    recorder.release();
	    recorder = null;
	}
    }
}
