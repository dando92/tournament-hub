import { type CSSProperties, useEffect, useRef, useState } from "react";

type Props = {
    text: string;
    className?: string;
};

export default function OverflowMarquee({ text, className = "" }: Props) {
    const viewportRef = useRef<HTMLSpanElement>(null);
    const contentRef = useRef<HTMLSpanElement>(null);
    const [distance, setDistance] = useState(0);
    const [active, setActive] = useState(false);

    useEffect(() => {
        const viewport = viewportRef.current;
        const content = contentRef.current;
        if (!viewport || !content) return;

        const measure = () => setDistance(Math.max(0, content.scrollWidth - viewport.clientWidth));
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(viewport);
        observer.observe(content);
        return () => observer.disconnect();
    }, [text]);

    const canMarquee = distance > 0;
    const style = { "--marquee-distance": `${distance}px` } as CSSProperties;

    return (
        <span
            ref={viewportRef}
            className={`group/song-title block min-w-0 overflow-hidden ${className}`}
            title={text}
            tabIndex={canMarquee ? 0 : undefined}
            onClick={() => {
                if (canMarquee && window.matchMedia("(hover: none)").matches) {
                    setActive((current) => !current);
                }
            }}
            onKeyDown={(event) => {
                if (canMarquee && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    setActive((current) => !current);
                }
            }}
        >
            <span
                ref={contentRef}
                style={style}
                className={`inline-block w-max whitespace-nowrap ${
                    canMarquee && active ? "motion-safe:animate-marquee" : ""
                } ${canMarquee ? "motion-safe:group-hover/song-title:animate-marquee motion-safe:group-focus/song-title:animate-marquee" : ""}`}
            >
                {text}
            </span>
        </span>
    );
}
