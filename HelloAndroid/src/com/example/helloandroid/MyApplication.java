package com.example.helloandroid;

import android.app.Application;
import android.util.Log;

public class MyApplication extends Application {
    
    private static MyApplication instance;
    private static String TAG = "HelloAndroid";
    
    public static MyApplication  getInstance() {
	return instance;
    }

    @Override
    public void onCreate() {
	// TODO Auto-generated method stub
	super.onCreate();
	instance = this;
	Log.i(TAG, "onCreate()");
    }

    @Override
    public void onLowMemory() {
	// TODO Auto-generated method stub
	super.onLowMemory();
	Log.i(TAG, "onLowMemory");
    }

    @Override
    public void onTerminate() {
	// TODO Auto-generated method stub
	super.onTerminate();
	Log.i(TAG, "onTerminate");
    }

    
}
