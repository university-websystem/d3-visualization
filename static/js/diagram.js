import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { sankey as Sankey, sankeyLeft, sankeyLinkHorizontal } from "https://cdn.jsdelivr.net/npm/d3-sankey@0.12/+esm";

document.addEventListener("DOMContentLoaded", function() {
    fetch('/get_edge_data')
        .then(response => response.json())
        .then(links => {
            const nodes = Array.from(
                new Set(
                    links.flatMap(l => [l.source, l.target])), name => ({name, category: name.replace(/ .*/, "")}
                )
            );

            drawSankeyDiagram({ nodes, links });
        })
        .catch(
            error => console.error("데이터를 가져오는 중 오류 발생: ", error)
        );
});

function drawSankeyDiagram(data) {
    console.log("data: ", data);

    const container = document.getElementById("diagram-container");
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    const format = d3.format(",.0f");

    // SVG 컨테이너 생성
    const svg = d3.select("#diagram")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;")

    // Sankey 레이아웃 설정
    const sankey = Sankey()
        .nodeId(d => d.name)
        .nodeAlign(sankeyLeft)
        .nodeWidth(15)
        .nodePadding(10)
        .extent([[1, 5], [width - 1, height - 5]]);

    let sankeyData = sankey({
        nodes: data.nodes.map(d => Object.assign({}, d)),
        links: data.links.map(d => Object.assign({}, d))
    });

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // 노드 그리기
    const rect = svg.append("g")
        .attr("stroke", "#000")
        .selectAll()
        .data(sankeyData.nodes)
        .join("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("fill", d => color(d.category));

    rect.append("title")
        .text(d => `${d.name}\n${format(d.value)} TWh`);

    // 링크 그리기
    const link = svg.append("g")
        .attr("fill", "none")
        .attr("stroke-opacity", 0.5)
        .selectAll()
        .data(sankeyData.links)
        .join("g")
        .style("mix-blend-mode", "multiply");

    const flowColor = "#d3d3d3";

    const linkPaths = link.append("path")
        .attr("d", sankeyLinkHorizontal())
        .attr("stroke-width", d => Math.max(1, d.width))
        .attr("stroke", flowColor)
        .on("mouseover", function () {
            d3.select(this).attr("stroke", "#808080");
        })
        .on("mouseout", function () {
            d3.select(this).attr("stroke", d => d.clicked ? "#808080" : "#d3d3d3");
        })
        .on("click", function (event, d) {
            d.clicked = !d.clicked;
            d3.select(this).attr("stroke", d.clicked ? "#808080" : "#d3d3d3");
        });

    link.append("title")
        .text(d => `${d.source.name} → ${d.target.name}\n${format(d.value)} TWh`);

    // 노드에 레이블 추가
    const text = svg.append("g")
        .selectAll()
        .data(sankeyData.nodes)
        .join("text")
        .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
        .text(d => d.name);

    // 드래그 기능 추가 (노드 위치 조정)
    const drag = d3.drag()
        .on("drag", function(event, d) {
            // 노드 이동
            const oldY0 = d.y0;
            const oldY1 = d.y1;
            
            d.x0 += event.dx;
            d.x1 += event.dx;
            d.y0 += event.dy;
            d.y1 += event.dy;

            // 연결된 링크의 y 좌표 업데이트
            sankeyData.links.forEach(link => {
                if (link.source === d) {
                    link.y0 += event.dy;
                }
                if (link.target === d) {
                    link.y1 += event.dy;
                }
            });

            // 노드와 텍스트 위치 업데이트
            d3.select(this)
                .attr("x", d.x0)
                .attr("y", d.y0)
                .attr("height", d.y1 - d.y0);

            // 텍스트 위치 업데이트
            text.filter(t => t === d)
                .attr("x", d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
                .attr("y", (d.y1 + d.y0) / 2);

            // 모든 링크 다시 그리기
            linkPaths.attr("d", sankeyLinkHorizontal());
        });

    // 드래그 적용
    rect.call(drag);
    text.call(drag);
}