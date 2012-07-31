package com.example.helloandroid;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Environment;
import android.util.Log;

public class Utils {

    public static final int MEDIA_TYPE_IMAGE = 1;
    public static final int MEDIA_TYPE_VIDEO = 2;

    public static boolean isIntentAvailable(Context context, String action) {
	final PackageManager packageManager = context.getPackageManager();
	final Intent intent = new Intent(action);
	List<ResolveInfo> list = packageManager.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY);
	return list.size() > 0;
    }

    /** Create a file Uri for saving an image or video */
    public static Uri getOutputMediaFileUri(int type) {
	return Uri.fromFile(getOutputMediaFile(type));
    }
    
    public static String getOutputMediaFilePath(int type) {
	String filePath = getOutputMediaFile(type).getAbsolutePath();
	Log.d("Utils", "filePath=" + filePath);
	return filePath;
    }

    /** Create a File for saving an image or video */
    private static File getOutputMediaFile(int type) {
	// To be safe, you should check that the SDCard is mounted
	// using Environment.getExternalStorageState() before doing this.

	File mediaStorageDir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES),
		"MyCameraApp");
	// This location works best if you want the created images to be shared
	// between applications and persist after your app has been uninstalled.

	// Create the storage directory if it does not exist
	if (!mediaStorageDir.exists()) {
	    if (!mediaStorageDir.mkdirs()) {
		Log.d("MyCameraApp", "failed to create directory");
		return null;
	    }
	}

	// Create a media file name
	String timeStamp = new SimpleDateFormat("yyyy-MM-dd_HH-mm-ss").format(new Date());
	File mediaFile;
	if (type == MEDIA_TYPE_IMAGE) {
	    mediaFile = new File(mediaStorageDir.getPath() + File.separator + "IMG_" + timeStamp + ".jpg");
	} else if (type == MEDIA_TYPE_VIDEO) {
	    mediaFile = new File(mediaStorageDir.getPath() + File.separator + "VID_" + timeStamp + ".mp4");
	} else {
	    return null;
	}

	Log.i("Utils", "mediaFile: " + mediaFile);
	return mediaFile;
    }
}
