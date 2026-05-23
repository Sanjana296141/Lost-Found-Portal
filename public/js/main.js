// old dark mode code here

const toggleBtn = document.getElementById("darkModeToggle");

if(toggleBtn){

    toggleBtn.addEventListener("click", () => {

        document.body.classList.toggle("dark-mode");

    });

}


// ================= TABLE SEARCH =================

const tableSearch = document.getElementById("tableSearch");

if(tableSearch){

    tableSearch.addEventListener("keyup", () => {

        const value = tableSearch.value.toLowerCase();

        const rows = document.querySelectorAll("table tr");

        rows.forEach((row, index) => {

            if(index === 0) return;

            const text = row.innerText.toLowerCase();

            row.style.display =
                text.includes(value)
                ? ""
                : "none";

        });

    });

}