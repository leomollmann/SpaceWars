class Ship{
  constructor(team, velocity){
    this.up = new THREE.Vector3(0,1,0);
    this.forces = new THREE.Vector3(0,0,0);
    this.velocity = velocity;
    this.sector = {};
    this.team = team;
    this.group = new THREE.Group();

    this.cohesionForces = [];
    this.separationForces = [];
    this.alignmentForces = [];

    this.cohesionWeight = 0.0005;
    this.separationWeight = 0.01;
    this.alignmentWeight = 0.008;
    this.boundingWeight = 0.00001;

    this.maxVelocity = 0.25;
    this.influenceRange = 20.0;
    this.influenceAngle = -0.7;
    this.separationDistance = 8.0;
  }

  buildMesh(geometry, lineMaterial, meshMaterial, position){
	
    this.group.add(new THREE.LineSegments(geometry, lineMaterial));
    this.group.add(new THREE.Mesh(geometry, meshMaterial));
    this.group.position.set(position.x, position.y, position.z);
  }

  addToScene(scene){
    scene.add(this.group);
  }

  clone(){
    return JSON.parse(JSON.stringify(this));
  }

  updateSector(){
    this.sector.x = Math.floor(this.group.position.x / this.influenceRange);
    this.sector.y = Math.floor(this.group.position.y / this.influenceRange);
    this.sector.z = Math.floor(this.group.position.z / this.influenceRange);
    let key = "x" + this.sector.x + "y" + this.sector.y + "z" + this.sector.z + "t" + this.team;

    if(sectors.get(key) == undefined){
      sectors.set(key, []);
    }
    sectors.get(key).push(this);
  }

  computeForces(){
    let influenceArea = [];
    for(let x = -1; x <= 1; x++){
      for(let y = -1; y <= 1; y++){
        for(let z = -1; z <= 1; z++){
          influenceArea.push(sectors.get(
            "x" + (this.sector.x + x) +
            "y" + (this.sector.y + y) +
            "z" + (this.sector.z + z) +
            "t" + this.team
          ));
        }
      }
    }

    influenceArea.forEach((sector) => {
      if(sector != undefined){
        let neighbourIndex;
        sector.forEach((neighbour, index) => {
          if(neighbour != undefined){
            //check if isnt yourself
            if(neighbour.group.uuid != this.group.uuid){
              //check influence sphere
              let distVect = neighbour.group.position.clone().sub(this.group.position);
              let distSq = distVect.clone().lengthSq();
              if(distSq < (this.influenceRange * this.influenceRange)){

                //compute separation
                if(distSq < (this.separationDistance * this.separationDistance)){
                  let separation = distVect.clone().normalize();
                  separation.multiplyScalar(this.separationDistance);
                  separation.sub(distVect);
                  this.separationForces.push(separation.clone().negate());
                  neighbour.separationForces.push(separation.clone());
                }

                //check if it is within the viewing angle
                if(this.velocity.dot(neighbour.group.position) > this.influenceAngle){
                  //compute cohesion
                  this.cohesionForces.push(distVect.clone());

                  //compute alignment
                  this.alignmentForces.push(neighbour.velocity.clone());
                }
                if(neighbour.velocity.dot(this.group.position) > neighbour.influenceAngle){
                  //compute cohesion
                  neighbour.cohesionForces.push(distVect.clone().negate());

                  //compute alignment
                  neighbour.alignmentForces.push(this.velocity.clone());
                }
              }
            }else{
              neighbourIndex = index;
            }
          }
        });
        sector[neighbourIndex] = undefined;
      }
    });
  }

  applyForces(){
    if(this.cohesionForces.length > 0){
      this.forces.set(0,0,0);
      this.cohesionForces.forEach((item) => {this.forces.add(item)});
      this.forces.multiplyScalar((1 / this.cohesionForces.length) * this.cohesionWeight);
      this.velocity.add(this.forces);
      this.cohesionForces = [];
    }

    if(this.separationForces.length > 0){
      this.forces.set(0,0,0);
      this.separationForces.forEach((item) => {this.forces.add(item)});
      this.forces.multiplyScalar(this.separationWeight);
      this.velocity.add(this.forces);
      this.separationForces = [];
    }

    if(this.alignmentForces.length > 0){
      this.forces.set(0,0,0);
      this.alignmentForces.forEach((item) => {this.forces.add(item)});
      this.forces.multiplyScalar((1 / this.alignmentForces.length) * this.alignmentWeight);
      this.velocity.add(this.forces);
      this.alignmentForces = [];
    }

    this.forces = this.group.position.clone().multiplyScalar(-this.boundingWeight);
    this.velocity.add(this.forces);

    this.velocity.clampLength(0,this.maxVelocity);
    this.group.position.add(this.velocity);
    this.group.quaternion.setFromUnitVectors(this.up, this.velocity.clone().normalize());
  }
}
