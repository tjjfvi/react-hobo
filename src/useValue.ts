import React from "react";

export const useValue = <V>(v: () => V): V => React.useState(v)[0];
