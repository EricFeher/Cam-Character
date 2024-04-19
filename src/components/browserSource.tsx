import React, { useRef, useEffect, useState } from 'react'
import { FaceLandmarker, PoseLandmarker, FilesetResolver, DrawingUtils, HandLandmarker } from '@mediapipe/tasks-vision'
import { performance as _performance } from "perf_hooks";
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

export default function BrowserSource() {
    const [faceLandmarkResults, setFaceLandmarkResults] = useState<any>();
    const [poseLandmarkResults, setPoseLandmarkResults] = useState<any>();
    const [handLandmarkResults, setHandLandmarkResults] = useState<any>();
    const [newCicle, setNewCicle] = useState<number>(0);
    const [playVideo, setPlayVideo] = useState<Boolean>(false);

    const listRef = useRef<HTMLUListElement | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    //NOTE: https://www.researchgate.net/figure/Mediapipe-hand-landmarks_fig1_355402809
    const [handBoneConnectionMap, setHandBoneMap] = useState([
        [0,1],
        [0,5],
        [0,9],
        [0,13],
        [0,17],
        [1,2],
        [2,3],
        [3,4],
        [5,6],
        [6,7],
        [7,8],
        [9,10],
        [10,11],
        [11,12],
        [13,14],
        [14,15],
        [15,16],
        [17,18],
        [18,19],
        [19,20],
    ])

	useEffect(()=>{
        init()
	},[])   

    useEffect(()=>{
        if(!canvasRef.current) return
        const context = canvasRef.current.getContext("2d") as any
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        context.globalCompositeOperation='destination-over';
        const drawingUtils = new DrawingUtils(context);
        

        resultFaceLandmark(drawingUtils);
        resultHandLandmark(drawingUtils);
        resultPoseLandmark(drawingUtils);
    },[newCicle]);

    async function init(){
        create3DScene()
        createVideo();
        startVideo();
        const filesetResolver = await getFilesetResolver();
		const faceLandmarker = await setUpFaceLandmarker(filesetResolver);
		const poseLandmarker = await setUpPoseLandmarker(filesetResolver);
		const handLandmarker = await setUpHandLandmarker(filesetResolver);

        let i=0;
        setInterval(()=>{
            i = (i + 1) % 2;
            if(videoRef.current!==null && videoRef.current.currentTime > 0){
                calculatePose(poseLandmarker);
                calculateFace(faceLandmarker);
                calculateHand(handLandmarker);
                setNewCicle(i % 2);
            }
        },1000/30);
        
    }

    function resultFaceLandmark(drawingUtils: DrawingUtils) {
        if(!faceLandmarkResults) return;
        if(!faceLandmarkResults.faceBlendshapes.length) return;
        
        for (const landmarks of faceLandmarkResults.faceLandmarks) {
            drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_TESSELATION,
              { color: "#C0C0C070", lineWidth: 1 }
            );
            drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
              { color: "#FF3030", lineWidth: 1   }
            );
            drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
              { color: "#FF3030", lineWidth: 1  }
            );
            drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
              { color: "#30FF30", lineWidth: 1   }
            );
            drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
              { color: "#30FF30", lineWidth: 1   }
            );
            drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
              { color: "#E0E0E0", lineWidth: 1   }
            );
            drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_LIPS,
              { color: "#E0E0E0", lineWidth: 1   }
            );
            drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
              { color: "#FF3030", lineWidth: 1   }
            );
            drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
              { color: "#30FF30", lineWidth: 1   }
            );
        }

        if(!listRef.current) return;

        listRef.current.innerHTML = "";
        let innerHtml = ""
        faceLandmarkResults.faceBlendshapes[0].categories.map((shape: any)=>{
            innerHtml+=`<li>${shape.categoryName} - ${Math.round(shape.score*1000)/1000}</li>`
        });
        //listRef.current.innerHTML=innerHtml;

    }

    function resultPoseLandmark(drawingUtils: DrawingUtils) {
        if(!poseLandmarkResults) return;

        for (const landmark of poseLandmarkResults.landmarks) {
        drawingUtils.drawLandmarks(landmark, {
            radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1)
        });
        drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS,{color: "#000000"});
        }
    }

    function resultHandLandmark(drawingUtils: DrawingUtils) {
        if(!handLandmarkResults) return;
        if(!handLandmarkResults.landmarks.length) return


        for (const landmark of handLandmarkResults.landmarks) {
            drawingUtils.drawConnectors(landmark, HandLandmarker.HAND_CONNECTIONS, {
              color: "#000000",
              lineWidth: 5
            });
            drawingUtils.drawLandmarks(landmark, { color: "#000000", lineWidth: 1 });
          }
        if(!listRef.current) return;


        let innerHtml = ""
        
        // A -> B
        for(let landmark of handLandmarkResults.landmarks){
            innerHtml+=`<li>Hand:</li>`
            for(let handBoneConnection of handBoneConnectionMap){
            innerHtml+=`<li>[${handBoneConnection[0]},${handBoneConnection[1]}](${landmark[handBoneConnection[0]].x - landmark[handBoneConnection[1]].x}, ${landmark[handBoneConnection[0]].y - landmark[handBoneConnection[1]].y}, ${landmark[handBoneConnection[0]].z - landmark[handBoneConnection[1]].z})</li>`

            }
        }
        listRef.current.innerHTML=innerHtml;

          
    }

    async function getFilesetResolver(): Promise<any> {
        const filesetResolver = await FilesetResolver.forVisionTasks(
            // path/to/wasm/root
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        return filesetResolver
    }

    async function setUpFaceLandmarker(filesetResolver: any): Promise<FaceLandmarker>{
        
        const landmarker = await FaceLandmarker.createFromOptions(
            filesetResolver,
            {
                baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                delegate: "GPU"
                },
                outputFaceBlendshapes: true,
                runningMode: "VIDEO",
                numFaces: 1
            });
        return landmarker;
    }

    async function setUpPoseLandmarker(filesetResolver: any): Promise<PoseLandmarker>{
        const landmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
                baseOptions: {
                  modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
                  delegate: "GPU"
                },
                runningMode: "VIDEO",
                numPoses: 1
              });

        return landmarker;
    }

    async function setUpHandLandmarker(filesetResolver: any): Promise<HandLandmarker>{
        const landmarker = await HandLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
              delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 2
          });

        return landmarker;
    }

    function createVideo() {
        const video = videoRef.current ? videoRef.current : document.createElement("video") as HTMLVideoElement;
        video.setAttribute("id", "video");
        video.style.width="640px";
        video.style.height="360px";
        video.style.display="none";
        video.setAttribute("autoplay", "muted");

        if(!canvasRef.current) return
        const canvas = canvasRef.current
        canvas.style.width="640px";
        canvas.style.height="360px";
        canvas.setAttribute("width","640");
        canvas.setAttribute("height","360");
    }

    function startVideo(){
        const constraints = {video: true, audio: false}
        const video = videoRef.current ? videoRef.current : document.createElement("video") as HTMLVideoElement;
        navigator.mediaDevices.getUserMedia(constraints)
            .then(stream => video.srcObject = stream)
            .catch(err => console.error(err))
    }
    
    function calculateFace(faceLandmarker: FaceLandmarker){
        let startTimeMs = performance.now()
        if(videoRef.current){
            if(faceLandmarker){
                let result = faceLandmarker.detectForVideo(videoRef.current, startTimeMs);
                setFaceLandmarkResults(result)
            }
        }
    }

    function calculatePose(poseLandmarker: PoseLandmarker){
        let startTimeMs = performance.now()
        if(videoRef.current){
            if(poseLandmarker){
                let result = poseLandmarker.detectForVideo(videoRef.current, startTimeMs)
                setPoseLandmarkResults(result)
            }
        }
    }

    function calculateHand(handLandmarker: HandLandmarker){
        let startTimeMs = performance.now()
        if(videoRef.current){
            if(handLandmarker){
                let result = handLandmarker.detectForVideo(videoRef.current, startTimeMs)
                setHandLandmarkResults(result)
            }
        }
    }

    function create3DScene(){
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000);

        const renderer = new THREE.WebGLRenderer();
        renderer.setSize( window.innerWidth, window.innerHeight );
        document.body.appendChild( renderer.domElement );
        
        const loader = new GLTFLoader();

        const planeGeometry = new THREE.PlaneGeometry(30,30)
        const planeMaterial = new THREE.MeshBasicMaterial({color:"#FFFFF"})
        const plane = new THREE.Mesh(planeGeometry,planeMaterial)
        scene.add(plane)
        plane.rotation.x = -0.5 * Math.PI
        plane.position.y = -1 

        let character: THREE.Group<THREE.Object3DEventMap>;

        loader.load( '/scene.gltf', function ( gltf ) {
            character = gltf.scene;
            character.scale.set(0.001, 0.001, 0.001); 
            const helper = new THREE.SkeletonHelper(character);

            character.traverse((n: any) => {
                if (n.isBone) console.log(n)
              })

            scene.add( gltf.scene );
            scene.add( helper );

        }, undefined, function ( error ) {

            console.error( error );

        } );
        const axesHelper = new THREE.AxesHelper(3);
        const orbitControl = new OrbitControls(camera, renderer.domElement);
        const ambientLight = new THREE.AmbientLight("#fff");
        const directionalLight = new THREE.DirectionalLight("#fff", 1)
        directionalLight.rotation.x = -Math.PI

        const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight)
        scene.add(directionalLight);
        scene.add(directionalLightHelper);
        scene.add(axesHelper);
        scene.add(ambientLight);
        camera.position.z = 1;
        orbitControl.update();

        function animate() {
            requestAnimationFrame( animate );

            if(character)
                // @ts-ignore
                character.getObjectByName("pinky_02_r_038").rotateZ(10)
                // @ts-ignore
                character.getObjectByName("pinky_01_r_037").rotateZ(10)
            renderer.render( scene, camera );

            

        }
        animate();
    }

    

  return (
    <div ref={containerRef} className='flex items-center justify-center'>
        {playVideo ? 
        <video width="640" height="360" ref={videoRef} controls>
            <source src="/video6.mp4" type="video/mp4" />
        </video> 
        :
        <video ref={videoRef}></video>
        }
        
        <canvas ref={canvasRef}></canvas>
        
        <ul ref={listRef}></ul>
    </div>
  )
}