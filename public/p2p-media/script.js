const Peer = window.Peer;

(async function main() {
  const localVideo = document.getElementById('js-local-stream');
  const localId = document.getElementById('js-local-id');
  const callTrigger = document.getElementById('js-call-trigger');
  const closeTrigger = document.getElementById('js-close-trigger');
  const remoteVideo = document.getElementById('js-remote-stream');
  const remoteId = document.getElementById('js-remote-id');
  const meta = document.getElementById('js-meta');
  const sdkSrc = document.querySelector('script[src*=skyway]');

  meta.innerText = `
    UA: ${navigator.userAgent}
    SDK: ${sdkSrc ? sdkSrc.src : 'unknown'}
  `.trim();

  const localStream = await navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: false
    })
    .catch(console.error);

  const audioStream = await navigator.mediaDevices
    .getUserMedia({
      video: false,
      audio: true
    })
    .then(stream => {
      // Create stereo audio
      const audioCtx = new(window.AudioContext || window.webkitAudioContext);
      const source = audioCtx.createMediaStreamSource(stream);
      const destinationL = audioCtx.createMediaStreamDestination();
      const destinationR = audioCtx.createMediaStreamDestination();
      const splitter = audioCtx.createChannelSplitter(2);
      source.connect(splitter);
      splitter.connect(destinationL, 0);
      splitter.connect(destinationR, 1);
      localStream.addTrack(destinationL.stream.getTracks()[0]);
      localStream.addTrack(destinationR.stream.getTracks()[0]);
    })
    .catch(console.error);
  
  localStream.getTracks().forEach((track, index) => {
    console.log(`localStream.getTracks()[${index}]:${track.kind}(${track.id})`);
    // output(Macbook)
    // localStream.getTracks()[0]:audio(a390254f-aefc-4aec-a85b-681dbcdcf287)
    // localStream.getTracks()[1]:audio(5a2534c7-3e11-4514-ad99-de6cbfb9bf77)
    // localStream.getTracks()[2]:video(c64e5119-de50-4409-880a-9969125ea4d9)
  })

  // Render local stream
  localVideo.muted = true;
  localVideo.srcObject = localStream;
  localVideo.playsInline = true;
  await localVideo.play().catch(console.error);

  const peer = (window.peer = new Peer({
    key: window.__SKYWAY_KEY__,
    debug: 3,
  }));

  // Register caller handler
  callTrigger.addEventListener('click', () => {
    // Note that you need to ensure the peer has connected to signaling server
    // before using methods of peer instance.
    if (!peer.open) {
      return;
    }

    const mediaConnection = peer.call(remoteId.value, localStream);

    mediaConnection.on('stream', async stream => {
      // Render remote stream for caller
      remoteVideo.srcObject = stream;
      remoteVideo.playsInline = true;
      await remoteVideo.play().catch(console.error);
    });

    mediaConnection.once('close', () => {
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      remoteVideo.srcObject = null;
    });

    closeTrigger.addEventListener('click', () => mediaConnection.close(true));
  });

  peer.once('open', id => (localId.textContent = id));

  // Register callee handler
  peer.on('call', mediaConnection => {
    mediaConnection.answer(localStream);

    mediaConnection.on('stream', async stream => {

      stream.getTracks().forEach((track, index) => {
        console.log(`remoteStream.getTracks()[${index}]:${track.kind}(${track.id})`);
      })

      //// ステレオ再生 ////
      // const audioCtx = new(window.AudioContext || window.webkitAudioContext);
      // const dest = audioCtx.createMediaStreamDestination();
      // const merger = audioCtx.createChannelMerger(2);
      // stream.getTracks().forEach((track, index) => {
      //   if (track.kind == 'audio') {
      //     console.log(`tmpStream.getTracks()[${index}]:${track.kind}(${track.id})`);
      //     const tmpStream = new MediaStream([track]);
      //     const mutedAudio = new Audio();
      //     mutedAudio.muted = true;
      //     mutedAudio.srcObject = tmpStream;
      //     mutedAudio.play();
      //     const source = audioCtx.createMediaStreamSource(tmpStream);
      //     source.connect(merger, 0, index);
      //   }
      // });
      // merger.connect(dest);

      // by Murakami
      // [1]
      const newAudioR = document.createElement('audio');
      const newAudioL = document.createElement('audio');
      newAudioR.autoplay = true;
      newAudioL.autoplay = true;
      const streamR = new MediaStream(stream.getTracks()[0]);
      const streamL = new MediaStream(stream.getTracks()[1]);
      newAudioR.srcObject = streamR;
      newAudioL.srcObject = streamL;
      console.log('再生 stream.getTracks()[0]: ' + stream.getTracks()[0]);
      console.log('再生 stream.getTracks()[1]: ' + stream.getTracks()[1]);

      // [2]
      // //受け取った音声からそれぞれ　Media Streamを作成
      // const streamR = new MediaStream(stream.getTracks()[0]);
      // const streamL = new MediaStream(stream.getTracks()[1]);
      // console.log('再生 stream.getTracks()[0]: ' + stream.getTracks()[0]);
      // console.log('再生 stream.getTracks()[1]: ' + stream.getTracks()[1]);
      // //MediaStreamからweb audio api のSourceを作成(上の図一番左)
      // const sourceR = audioCtx.createMediaStreamSource(streamR);
      // const sourceL = audioCtx.createMediaStreamSource(streamL);
      // //Destinationを作成
      // const destinationR = audioCtx.createMediaStreamDestination();
      // const destinationL = audioCtx.createMediaStreamDestination();
      // //接続
      // sourceR.connect(destinationR);
      // sourceL.connect(destinationR);
      // //audioタグの作成
      // const newAudioR = document.createElement('audio');
      // const newAudioL = document.createElement('audio');
      // //audioタグのstreamを設定
      // newAudioR.autoplay = true;
      // newAudioL.autoplay = true;
      // newAudioR.srcObject = destinationR.stream
      // newAudioL.srcObject = destinationL.stream

      // Render remote stream for callee
      remoteVideo.srcObject = stream;
      remoteVideo.muted = true;
      remoteVideo.playsInline = true;
      await remoteVideo.play().catch(console.error);
    });

    mediaConnection.once('close', () => {
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      remoteVideo.srcObject = null;
    });

    closeTrigger.addEventListener('click', () => mediaConnection.close(true));
  });

  peer.on('error', console.error);
})();
