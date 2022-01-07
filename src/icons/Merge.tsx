import * as React from "react";

const SvgMerge = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="18" height="16" viewBox="0 0 18 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M2 6H0V0H8V2H2V6ZM16 14H10V16H18V10H16V14ZM2 14V10H0V16H8V14H2ZM18 0H10V2H16V6H18V0ZM5 9V11L8 8L5 5V7H0V9H5ZM13 7V5L10 8L13 11V9H18V7H13Z" fill="currentColor" />
  </svg>
);

export default SvgMerge;
