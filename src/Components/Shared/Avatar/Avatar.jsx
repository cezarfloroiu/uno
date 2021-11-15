import React from "react";
import styled from "styled-components";
const Cavatar = styled.img`
  width: 10vw;
  height: 10vw;
  border-radius: 50%;
  border: 2px solid #f37006;
  outline: 1px solid #f3f2f1;
  box-shadow: 0px 0px 6px 3px #f94a00;
  object-fit: cover;
  object-position: top;
`;
const Avatar = ({ playerImg }) => {
  const imgSource = playerImg ? playerImg : "./imges/avatar.png";

  return <Cavatar src={imgSource} alt="" />;
};

export default Avatar;