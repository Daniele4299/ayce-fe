import Link from "next/link";
import { styled } from "@mui/material";
import Image from "next/image";

const LinkStyled = styled(Link)(() => ({
  height: "168px",
  width: "300px",
  overflow: "hidden",
  display: "block",
}));

const Logo = () => {
  return (
    <LinkStyled href="/">
      <Image src="/images/logos/logo_small.png" alt="logo" height={168} width={300} priority />
    </LinkStyled>
  );
};

export default Logo;
  