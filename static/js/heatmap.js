import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

document.addEventListener("DOMContentLoaded", function() {
    fetch('/get_dji_data')
        .then(response => response.json())
        .then(dji => {
            console.log("dji: ", dji);

            drawCalendarHeatmap(dji);
        })
        .catch(
            error => console.error("데이터를 가져오는 중 오류 발생: ", error)
        );
})

function drawCalendarHeatmap(dji) {
    const cellSize = 16;    // 각 날짜 셀의 크기
    const height = cellSize * 7;    // 한 주(월~금)의 높이
    const width = (cellSize + 1.5) * 53 // 차트의 전체 너비

    // 날짜 및 값 포맷팅 함수 정의
    const formatValue = d3.format("+.2%");
    const formatClose = d3.format(",.2f");
    const formatDate = d3.utcFormat("%Y년 %m월 %d일");
    const formatDay = i => "SMTWFS"[i];
    const formatMonth = d3.utcFormat("%b");

    // D3의 날짜 계산을 위한 헬퍼 함수
    const timeWeek = d3.utcMonday;
    const countDay = i => (i + 6) % 7;

    // **데이터 변환**
    // 각 날짜별 변동률(%)을 계산하여 색상으로 표현할 데이터 준비
    const data = d3.pairs(dji, ({ 종가: Previous }, { 날짜, 종가 }) => ({
        date: new Date(날짜),
        value: (종가 - Previous) / Previous,
        close: 종가
    }));

    // **값의 범위 계산 (outlier 제거)**
    const max = d3.quantile(data, 0.9975, d => Math.abs(d.value));
    const color = d3.scaleSequential(d3.interpolatePiYG).domain([-max, +max]);

    // **연도별 데이터 그룹화**
    const years = d3.groups(data, d => d.date.getUTCFullYear()).reverse();

    // **월 구분을 위한 함수**
    function pathMonth(t) {
        const d = Math.max(0, Math.min(5, countDay(t.getUTCDay())));
        const w = timeWeek.count(d3.utcYear(t), t);
        return `${d === 0 ? `M${w * cellSize},0`
            : d === 5 ? `M${(w + 1) * cellSize},0`
            : `M${(w + 1) * cellSize},0V${d * cellSize}H${w * cellSize}`}V${5 * cellSize}`;
    }

    // **SVG 생성**
    const svg = d3.select("#heatmap")
        .append("svg")
        .attr("width", width)
        .attr("height", height * years.length)
        .attr("viewBox", [0, 0, width, height * years.length])
        .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

    // **연도별 그룹 생성**
    const year = svg.selectAll("g")
        .data(years)
        .join("g")
        .attr("transform", (d, i) => `translate(40.5,${height * i + cellSize * 1.5})`);

    // **연도 라벨 추가**
    year.append("text")
        .attr("x", -5)
        .attr("y", -5)
        .attr("font-weight", "bold")
        .attr("text-anchor", "end")
        .text(([key]) => key);

    // **요일 라벨 추가**
    year.append("g")
        .attr("text-anchor", "end")
        .selectAll("text")
        .data(d3.range(1, 6)) // 월~금만 표시
        .join("text")
        .attr("x", -5)
        .attr("y", i => (countDay(i) + 0.5) * cellSize)
        .attr("dy", "0.31em")
        .text(formatDay);

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "#333")
        .style("color", "#fff")   
        .style("border", "1px solid #ccc")
        .style("border-radius", "4px")
        .style("padding", "5px")
        .style("font-size", "12px");
        
    // **캘린더 히트맵 그리기**
    year.append("g")
        .selectAll("rect")
        .data(([, values]) => values.filter(d => ![0, 6].includes(d.date.getUTCDay()))) // 주말 제외
        .join("rect")
        .attr("width", cellSize - 1)
        .attr("height", cellSize - 1)
        .attr("x", d => timeWeek.count(d3.utcYear(d.date), d.date) * cellSize + 0.5)
        .attr("y", d => countDay(d.date.getUTCDay()) * cellSize + 0.5)
        .attr("fill", d => color(d.value))
        .on("mouseover", function(event, d) {
            d3.select(this).attr("stroke", "black").attr("stroke-width", 1.5); 

            tooltip.style("visibility", "visible")
                .html(`${formatDate(d.date)}<br>
                        변동: ${formatValue(d.value)}<br>
                        종가: $${formatClose(d.close)}`)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY + 10}px`);
        })
        .on("mousemove", function(event) {
            tooltip.style("left", `${event.pageX + 10}px`).style("top", `${event.pageY + 10}px`);
        })
        .on("mouseout", function() {
            d3.select(this).attr("stroke", null).attr("stroke-width", null); // 테두리 제거
            tooltip.style("visibility", "hidden");
        });

    // **월 경계선 추가**
    const month = year.append("g")
        .selectAll("g")
        .data(([, values]) => d3.utcMonths(d3.utcMonth(values[0].date), values.at(-1).date))
        .join("g");

    month.filter((d, i) => i).append("path")
        .attr("fill", "none")
        .attr("stroke", "#fff")
        .attr("stroke-width", 3)
        .attr("d", pathMonth);

    // **월 라벨 추가**
    month.append("text")
        .attr("x", d => timeWeek.count(d3.utcYear(d), timeWeek.ceil(d)) * cellSize + 2)
        .attr("y", -5)
        .text(formatMonth);
}