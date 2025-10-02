#include "model2.inc"

#version 3.7;
global_settings{ assumed_gamma 1.0 }
#default{ finish{ ambient 0.1 diffuse 0.9 }} 
#declare cam = camera { perspective angle 55
                        // location  <22, 12, 23> * 30
                        location  <RADIUS, RADIUS, RADIUS> * 1.5
                        right     x * image_width / image_height
                        look_at   CENTER}
camera{cam}
light_source{< 3000,3000,-3000> color rgb <1.0, 1.0, 1.0>}
