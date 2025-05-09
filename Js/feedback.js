
      // Validate form fields
      function formValidate() {
        const nameCheck = document.getElementById("name").value.trim();
        const emailCheck = document.getElementById("email").value.trim();
        const commentCheck = document.getElementById("comment").value.trim();

        if (!nameCheck || !emailCheck || !commentCheck) {
          alert("Field cannot be empty!");
          return false;
        } else {
          alert("Form Submitted Successfully");
          return true;
        }
      }

      // Rating functionality
      function rate(type) {
        const ratings = {
          meh: document.getElementById("mehRating"),
          smile: document.getElementById("smileRating"),
          happy: document.getElementById("happyRating"),
        };

        Object.keys(ratings).forEach((key) => {
          ratings[key].style.opacity = key === type ? "1" : "0.5";
          if (key === type) {
            ratings[key].classList.add("active");
          } else {
            ratings[key].classList.remove("active");
          }
        });
      }