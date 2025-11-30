document.getElementById("fetchData").addEventListener("click", () => {
    fetch("/api/hello")
        .then(res => res.json())
        .then(data => {
            document.getElementById("result").innerText = "Sunucu cevabı: " + data.message;
        });
});
