/**
 * 3D Card Effect - inspired by Aceternity UI.
 * Perspective tilt that follows the mouse cursor on hover.
 * Child elements can "float" at different Z-depths using CardItem.
 */
import {
  createContext,
  type ElementType,
  type MouseEvent,
  type ReactNode,
  useContext,
  useRef,
  useState,
} from "react";

/* ------------------------------------------------------------------ */
/* Context to share hover state with child CardItems                   */
/* ------------------------------------------------------------------ */
const CardContext = createContext<{
  isHovered: boolean;
  rotateX: number;
  rotateY: number;
}>({ isHovered: false, rotateX: 0, rotateY: 0 });

/* ------------------------------------------------------------------ */
/* CardContainer - outer wrapper that establishes perspective          */
/* ------------------------------------------------------------------ */
export function CardContainer({
  children,
  className = "",
  containerClassName = "",
}: {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) {
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rotateX = ((e.clientY - centerY) / (rect.height / 2)) * -8;
    const rotateY = ((e.clientX - centerX) / (rect.width / 2)) * 8;
    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotate({ x: 0, y: 0 });
  };

  return (
    <CardContext.Provider value={{ isHovered, rotateX: rotate.x, rotateY: rotate.y }}>
      <div
        className={`flex items-center justify-center ${containerClassName}`}
        style={{ perspective: "1000px" }}
      >
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`relative transition-all duration-200 ease-linear ${className}`}
          style={{
            transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
            transformStyle: "preserve-3d",
          }}
        >
          {children}
        </div>
      </div>
    </CardContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* CardBody - inner card surface                                       */
/* ------------------------------------------------------------------ */
export function CardBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`[transform-style:preserve-3d] ${className}`}>{children}</div>;
}

/* ------------------------------------------------------------------ */
/* CardItem - individual element that can float at a Z-depth           */
/* ------------------------------------------------------------------ */
export function CardItem({
  children,
  className = "",
  translateZ = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  translateZ?: number | string;
  as?: ElementType;
}) {
  const { isHovered } = useContext(CardContext);
  const z = typeof translateZ === "string" ? translateZ : `${translateZ}px`;

  return (
    <Tag
      className={`transition-transform duration-200 ease-linear ${className}`}
      style={{
        transform: isHovered ? `translateZ(${z})` : "translateZ(0px)",
        transformStyle: "preserve-3d",
      }}
    >
      {children}
    </Tag>
  );
}
