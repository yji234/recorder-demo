let rec;
let wave;
let recBlob;
let recordTransformData = null;
var controlButton = document.getElementById('rec-button');
var logContainer = document.querySelector('.asr-console');
let recordStarted = false;
var filename_index = 1;
var worker = new Worker('worker.js');

worker.onmessage = function(e) {
  switch(e.data.command) {
    case 'save-audio':
      recStop()
      break;
    case 'socket-ready':
      StartRec();
      break;
    case 'asr-result':
      var json = JSON.parse(e.data.data);
      if (json.code == 0) {
        UpdateResult(json);
      }
      break;
  }
}

// 开始录音
controlButton.onclick = function() {
  if (recordStarted) {  // 若正在录音则关闭
    StopRec();
  } else {  // 否则，正常进行
    worker.postMessage({
      command: 'start',
      data: 'DAHAI-GEN-0-THR',
    });
  }
}

function StartRec() {
  recordStarted = true;
  controlButton.style.backgroundColor = "rgba(0,0,0,0)";
  controlButton.style.backgroundSize = "60%";
  controlButton.style.backgroundImage = "url('./images/stop.png')";
  recOpen();
}

// 调用open打开录音请求好录音权限
const recOpen = function(){
	rec = null;
	wave = null;
	recBlob = null;
	var newRec = Recorder({
    type: 'wav',
    sampleRate: 16000,
    bitRate: 16,
    bufferSize: 4096,
    onProcess: (
      buffers,
      powerLevel,
      bufferDuration,
      bufferSampleRate,
    ) => {
      //可视化图形绘制
			wave.input(buffers[buffers.length-1],powerLevel,bufferSampleRate);
      recordTransformData = Recorder.SampleData(buffers, bufferSampleRate, 16000,
        {
          index: recordTransformData ? recordTransformData.index : 0,
          offset: recordTransformData ? recordTransformData.offset : 0.0,
        });
      if (bufferDuration / 1000 >= 60) {
        console.log('您已录制超过最大时长: 1分钟');
        recStop();
      }
      if (recordStarted) {
        worker.postMessage({
          command: 'decode',
          data: recordTransformData.data,  // 音频数据
        });
      }
    },
  });
  
  //打开麦克风授权获得相关资源
	newRec.open(function(){
		rec = newRec;
    // 创建这些音频可视化图形
    wave = Recorder.FrequencyHistogramView({elem:".recwave"});
    // 开始录音
    recStart();
    // 初始化音频显示结果
    AppendResult();
  },function(msg,isUserNotAllow){
    // 用户拒绝未授权或不支持
    console.log((isUserNotAllow?"UserNotAllow，":"")+"打开录音失败："+msg);
	});
};

// 打开录音: 打开了录音后才能进行start、stop调用
function recStart(){
	if(rec && Recorder.IsOpen()){
		recBlob = null;
		rec.start();
	}
};

function AppendResult() {
  var section = document.querySelector('.clone-node .output-template').cloneNode(true);
  section.querySelector('.title').innerText = "第" + filename_index + "段录音：";
  filename_index++;
  logContainer.prepend(section);
}

function UpdateResult(json) {
  if (json.result == "") {
    return;
  }
  var section = logContainer.children[0];
  var resultContainer = section.querySelector('.asr-result');
  if (resultContainer.children.length == 0) {
    AppendASRText(json);
  }
  else {
    var last = resultContainer.lastChild;
    if (last.getAttribute('is_partial') == 'false') {
      AppendASRText(json);
    }
    else {
      last.innerText = json.result;
      last.setAttribute('is_partial', json.is_partial);
    }
  }
}

function AppendASRText(json) {
  var section = logContainer.children[0];
  var resultContainer = section.querySelector('.asr-result');
  var li = document.createElement('li');
  li.innerText = json.result;
  li.setAttribute('is_partial', json.is_partial);
  resultContainer.append(li);
}

function StopRec() {
  recordStarted = false;
  controlButton.style.backgroundColor = "lightpink";
  controlButton.style.backgroundSize = "60%";
  controlButton.style.backgroundImage = "url('./images/microphone.png')";

  worker.postMessage({
    command: 'stop-record'
  });
}

// 结束录音，得到音频文件
function recStop(){
	if(!(rec && Recorder.IsOpen())){
    console.log('未打开录音');
		return;
	};
	rec.stop(function(blob,duration){
		recBlob = blob;
    recClose(); 
    SaveResult((window.URL||webkitURL).createObjectURL(blob));
	},function(msg){
    console.log("录音失败:"+msg);
	});
};

// 关闭录音，释放资源
function recClose(){
	if(rec){
		rec.close();
	}
};

function SaveResult(dataUri) {
  var section = logContainer.children[0];
  var downloadButton = section.querySelector('.download-button');
  downloadButton.setAttribute('href', dataUri);
  downloadButton.setAttribute('download', 'my-recording-'+filename_index);
  var player = section.querySelector('.player');
  player.setAttribute('src', dataUri);
}


function CopyText(class_name) {
  var text = document.querySelector('.'+class_name);
  text.select();
  document.execCommand('copy');
}