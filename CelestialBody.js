class CelestialBody{
  constructor(radius, recursionLevel){
    this.recursionLevel = recursionLevel;
    this.radius = radius;
    this.group = new THREE.Group();

    this.index = 0;
    this.middlePointIndexCache = [];

    this.geometry = new THREE.Geometry();
    let t = (1.0 + Math.sqrt(5.0)) / 2;

    this.addVertex(new THREE.Vector3(-1,  t,  0));
    this.addVertex(new THREE.Vector3( 1,  t,  0));
    this.addVertex(new THREE.Vector3(-1, -t,  0));
    this.addVertex(new THREE.Vector3( 1, -t,  0));

    this.addVertex(new THREE.Vector3( 0, -1,  t));
    this.addVertex(new THREE.Vector3( 0,  1,  t));
    this.addVertex(new THREE.Vector3( 0, -1, -t));
    this.addVertex(new THREE.Vector3( 0,  1, -t));

    this.addVertex(new THREE.Vector3( t,  0, -1));
    this.addVertex(new THREE.Vector3( t,  0,  1));
    this.addVertex(new THREE.Vector3(-t,  0, -1));
    this.addVertex(new THREE.Vector3(-t,  0,  1));

    this.geometry.faces.push(
      // 5 faces around point 0
      new THREE.Face3(0, 11, 5),
      new THREE.Face3(0, 5, 1),
      new THREE.Face3(0, 1, 7),
      new THREE.Face3(0, 7, 10),
      new THREE.Face3(0, 10, 11),

      // 5 adjacent faces
      new THREE.Face3(1, 5, 9),
      new THREE.Face3(5, 11, 4),
      new THREE.Face3(11, 10, 2),
      new THREE.Face3(10, 7, 6),
      new THREE.Face3(7, 1, 8),

      // 5 faces around point 3
      new THREE.Face3(3, 9, 4),
      new THREE.Face3(3, 4, 2),
      new THREE.Face3(3, 2, 6),
      new THREE.Face3(3, 6, 8),
      new THREE.Face3(3, 8, 9),

      // 5 adjacent faces
      new THREE.Face3(4, 9, 5),
      new THREE.Face3(2, 4, 11),
      new THREE.Face3(6, 2, 10),
      new THREE.Face3(8, 6, 7),
      new THREE.Face3(9, 8, 1)
    );

    // refine triangles
    for (let i = 0; i < this.recursionLevel; i++){
      let faces = [];
      this.geometry.faces.forEach((face) => {
        // replace triangle by 4 triangles
        let a = this.getMiddlePoint(face.a, face.b);
        let b = this.getMiddlePoint(face.b, face.c);
        let c = this.getMiddlePoint(face.c, face.a);

        faces.push(
          new THREE.Face3(face.a, a, c),
          new THREE.Face3(face.b, b, a),
          new THREE.Face3(face.c, c, b),
          new THREE.Face3(a, b, c)
        );
      });
      this.geometry.faces = faces;
    }

    const simplex = new SimplexNoise();

    this.geometry.vertices.forEach((vertex) => {
      const octave1 = simplex.noise3d(vertex.x * 1, vertex.y * 1, vertex.z * 1)/10;
      const octave2 = simplex.noise3d(vertex.x * 2, vertex.y * 2, vertex.z * 2)/20;
      const octave3 = simplex.noise3d(vertex.x * 4, vertex.y * 4, vertex.z * 4)/40;
      vertex.add(vertex.clone().normalize().multiplyScalar(octave1 + octave2 + octave3));
    });

    this.geometry.scale(this.radius, this.radius, this.radius);
    this.geometry.computeFaceNormals();
    this.geometry.computeVertexNormals();

    this.geometry = new THREE.BufferGeometry().fromGeometry(this.geometry);
  }

  setRotation(rotationAxis, rotationSpeed){
  	this.rotationAxis = rotationAxis;
  	this.rotationSpeed = rotationSpeed;
  	this.rotation = 0;
  }

  setOrbit(){

  }

  buildMesh(lineMaterial, meshMaterial, position){
    this.group.add(new THREE.Mesh(this.geometry, lineMaterial));
    this.group.add(new THREE.Mesh(this.geometry, meshMaterial));
    this.group.position.set(position.x, position.y, position.z);
  }

  addToScene(scene){
    scene.add(this.group);
  }

  addVertex(vertice){
    this.geometry.vertices.push(vertice.clone().normalize());
    return this.index++;
  }

  getMiddlePoint(p1, p2){
    let smallerIndex, greaterIndex;
    if(p1 < p2){
      smallerIndex = p1;
      greaterIndex = p2;
    }else{
      smallerIndex = p2
      greaterIndex = p1;
    }

    let key = "s" + smallerIndex + "g" + greaterIndex;
    if (this.middlePointIndexCache[key] != undefined) return this.middlePointIndexCache[key];

    let middle = this.geometry.vertices[p1].clone();
    middle.add(this.geometry.vertices[p2]);
    middle.divideScalar(2.0);

    let i = this.addVertex(middle);
    this.middlePointIndexCache[key] = i;
    return i;
  }

  rotate(){
  	this.rotation += this.rotationSpeed;
  	this.group.quaternion.setFromAxisAngle(this.rotationAxis, this.rotation);
  }
}
