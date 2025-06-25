function HVFDraw(enter, centerAlign) {
  lineCount = 0;

  lineCountTotal = 1;

  var lineTotalhorSpacing = [];
  lineTotalhorSpacing.push(0.0);

  var draw = false;
  var letter = 0;
  var penpos = new THREE.Vector3();

  var totalhorSpacing = 0.0;
  var vertCount = 0;

  //var enter = "Hershey\nVector Font\nRendering\nby\nompu co";

  var enc = new TextEncoder();
  var result = enc.encode(enter);

  var t = simplex;

  if (centerAlign === undefined) centerAlign = false;
  var lineSize = 30.0;

  var size = 32.0;

  var pos = new THREE.Vector3();

  var center = new THREE.Vector2();
  for (var ln = 0; ln < result.length; ln++) {
    if (result[ln] == 10) {
      lineCountTotal++;
      lineTotalhorSpacing.push(0.0);
    } else {
      letter = (result[ln] - 32) % 95;
      letter = Math.max(0, letter);
      lineTotalhorSpacing[lineCountTotal - 1] += t[letter][1];
      vertCount += t[letter][0];
    }
  }

  for (var i = 0; i < lineCountTotal; i++) {
    totalhorSpacing = Math.max(totalhorSpacing, lineTotalhorSpacing[i]);
  }

  //var yOffset = lineCountTotal * lineSize/(lineCountTotal) * 0;

  var vLength = Math.trunc(vertCount * 2 + 4);

  var vtx = [];
  var uv2 = [];
  var uvS = [];
  var ind = []; //new List<int>();
  var v = 0;
  center = new THREE.Vector2(
    centerAlign ? lineTotalhorSpacing[lineCount] / 2.0 : totalhorSpacing / 2.0,
    0.0
  );

  ///*

  penpos = new THREE.Vector3(0, lineSize * (lineCountTotal / 2.0 - 0.85), 0);
  //		Debug.Log(lineCountTotal);
  for (var l = 0; l < result.length; l++) {
    letter = (result[l] - 32) % 95;

    if (result[l] == 10) {
      lineCount++;
      penpos = new THREE.Vector3(0, penpos.y - lineSize, 0);
      if (centerAlign)
        center = new THREE.Vector2(lineTotalhorSpacing[lineCount] / 2, 0);
    } else {
      var horSpacing = t[letter][1];
      //var g = Math.trunc(Random.Range(-95,95));
      //if (g<3)g=0;

      //letter=(letter+g+95)%95;

      var vertexCount = t[letter][0];

      for (var i = 2; i < 112; i += 2) {
        //if(pos!=-Vector2.one)ind.Add(v);

        pos = new THREE.Vector2(t[letter][i], t[letter][i + 1]);
        //console.log(pos);
        uv2.push(pos);

        uvS.push(new THREE.Vector2(l, result.length));

        //if(pos.x!=-1 && pos.y!=-1)//-THREE.Vector2(1,1))
        vtx.push(
          new THREE.Vector3(
            (pos.x + penpos.x - center.x) / size,
            (pos.y + penpos.y - center.y) / size,
            0
          )
        );
        //if(pos!=-Vector2.one)ind.Add(v);

        //v++;

        //}
      }

      penpos = new THREE.Vector3(
        penpos.x + horSpacing,
        penpos.y + 0.0,
        penpos.z + 0.0
      );
    }
  }

  for (var i = 0; i < vtx.length - 1; i++) {
    //if(uv2[i]!=-new THREE.Vector2(1,1)&&uv2[i+1]!=-new THREE.Vector2(1,1) &&i%55<54){
    if (uv2[i].x != -1 && uv2[i + 1].x != -1 && i % 55 < 54) {
      ind.push(i);
      ind.push(i + 1);
    }
  }

  var vOut = [];
  for (var i = 0; i < ind.length; i++) {
    vOut.push(vtx[ind[i]]);
  }

  var geometry = new THREE.BufferGeometry().setFromPoints(vOut);

  var vid = new Float32Array(geometry.attributes.position.count);

  for (var i = 0; i < vOut.length; i++) {
    vid[i] =
      (Math.abs(i - vOut.length / 2.0) / vOut.length) * 128.0 + 180.0 / 2.0; ///vOut.length;//Math.random() * 5;
  }

  geometry.setAttribute("vertex_id", new THREE.BufferAttribute(vid, 1));

  return geometry;

  /*

		ms.Clear();
		ms.vertices = vtx.ToArray();
		ms.SetIndices(ind.ToArray(),MeshTopology.Lines,0);

		ms.uv = uvS.ToArray();

		bd.size=Vector3.one*1000f;
		ms.bounds = bd;
		

		this.GetComponent<MeshFilter>().mesh=ms;
        */
}
