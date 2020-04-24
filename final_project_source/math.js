export function normalize(v) {
    const mag = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2])
    if(mag == 0) return v 

    v[0] = v[0] / mag 
    v[1] = v[1] / mag 
    v[2] = v[2] / mag

    return v
}

export function cross(v1, v2) {

    let vR = [0.0,0.0,0.0];
    vR[0] =   ( (v1[1] * v2[2]) - (v1[2] * v2[1]) );
    vR[1] = - ( (v1[0] * v2[2]) - (v1[2] * v2[0]) );
    vR[2] =   ( (v1[0] * v2[1]) - (v1[1] * v2[0]) );
    return vR;
}
