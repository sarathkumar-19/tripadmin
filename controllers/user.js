const connection = require("../utils/database");
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Get Recent Users
exports.getRecentUsers = async (req, res) => {
  try {
    const query = `
      SELECT firstName, email 
      FROM users
      ORDER BY createdAt DESC 
      LIMIT 5;
    `;
    
    connection.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching recent users:', err);
        return res.status(500).json({ message: "Server error" });
      }
      res.json(results);
    });
  } catch (err) {   
    res.status(500).json({ message: "Server error" });
  }
};

// Get User Profile
exports.getUserProfile = async (req, res) => {
  try {
    const email = req.user.email;
    
    // console.log("32 email ", email);
    
    const query = `
      SELECT user_id, userName, firstName, middleName, lastName, email, mobile, gender, dob, isEmailVerified, isMobileVerified, martialStatus as maritalStatus
      FROM users 
      WHERE email = ?;
    `;

    connection.query(query, [email], (err, results) => {
      if (err) {
        console.error('Error fetching user profile:', err);
        return res.status(500).json({ message: "Internal server error" });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      // console.log("47 from user controller ", results[0]);
      
      
      res.status(200).json(results[0]);
    });
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};
// Edit User Profile
exports.editUserProfile = async (req, res) => {
  // console.log(res);
  
  // console.log("59 req data ", req.body);
  try {
    let { firstName, middleName, lastName, mobile, dob, gender, email, maritalStatus } = req.body;

    // Switch for marital status: 's' for single, 'm' for married
    let maritalStatusValue;
    switch (maritalStatus) {
      case 's':
        maritalStatusValue = 'single';
        break;
      case 'm':
        maritalStatusValue = 'married';
        break;
      default:
        maritalStatusValue = maritalStatus; // Keep original value if not 's' or 'm'
    }

    // Switch for gender: 'Male' -> 'M', 'Female' -> 'F'
    let genderValue;
    switch (gender?.toLowerCase()) {
      case 'male':
        genderValue = 'M';
        break;
      case 'female':
        genderValue = 'F';
        break;
      default:
        genderValue = gender; // Keep original value if not 'Male' or 'Female'
    }

    // console.log("60 maritalStatus ", maritalStatusValue);
    // console.log("60 gender ", genderValue);
    
    // Check if maritalStatus is provided, if not, exclude it from the update
    let updateQuery, queryParams;
    
    // Use the correct user_id property
    const userId = req.user.user_id; // or req.user.id, depending on your auth middleware

    if (maritalStatusValue !== undefined && maritalStatusValue !== null && maritalStatusValue !== '') {
      updateQuery = `
        UPDATE users 
        SET firstName = ?, middleName = ?, lastName = ?, mobile = ?, dob = ?, gender = ?, email = ?, martialStatus = ? 
        WHERE email = ?;
      `;
      queryParams = [firstName, middleName, lastName, mobile, dob, genderValue, email, maritalStatusValue, email];
    } else {
      updateQuery = `
        UPDATE users 
        SET firstName = ?, middleName = ?, lastName = ?, mobile = ?, dob = ?, gender = ?, email = ? 
        WHERE user_id = ?;
      `;
      queryParams = [firstName, middleName, lastName, mobile, dob, genderValue, email, userId];
    }

    // Update the user profile
    connection.query(updateQuery, queryParams, (err, result) => {
      if (err) {
        console.error('Error updating user profile:', err);
        return res.status(500).json({ message: "Internal server error" });
      }

      // Fetch the updated user profile
      const fetchQuery = `SELECT firstName, middleName, lastName, email, mobile, gender, dob, isEmailVerified, isMobileVerified, martialStatus as maritalStatus, DATE_FORMAT(dob, '%Y-%m-%d') AS dob FROM users WHERE user_id = ?;`;
      connection.query(fetchQuery, [userId], (err, rows) => {
        if (err) {
          console.error('Error fetching updated user profile:', err);
          return res.status(500).json({ message: "Internal server error" });
        }

        if (rows.length > 0) {
          // Send the updated user data as an object
          // console.log("Sending data is ", rows[0]);
          user = rows[0]
          res.status(200).json({
            ...user,
            message : "Profile Edited Sucessfully"
          });
        } else {
          res.status(404).json({ message: "User not found" });
        }
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};


// My Bookings
exports.myBookings = async (req, res) => {
  try {
    const userId = req.user;
    const query = `
      SELECT 
        u.id AS user_id, u.name AS user_name, u.email AS user_email,
        b.id AS booking_id, b.departure_date, b.arrival_date, b.status,
        t.name AS train_name, fs.name AS from_station, ts.name AS to_station,
        r.departure_time AS departure_time, r.arrival_time AS arrival_time
      FROM 
        users u
        JOIN Bookings b ON u.id = b.UserId
        JOIN Trains t ON b.TrainId = t.id
        JOIN Stations fs ON b.from_station_id = fs.id
        JOIN Stations ts ON b.to_station_id = ts.id
        JOIN Routes r ON t.id = r.StationId
      WHERE 
        u.id = ?;
    `;
    
    connection.query(query, [userId], (err, bookings) => {
      if (err) {
        console.error('Error fetching booking details:', err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      res.status(200).json({ bookings });
    });
  } catch (error) {
    console.error("Error fetching booking details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Add Traveller
exports.addTraveller = async (req, res) => {
  console.log("Passenger API triggered..");
  const user_id = req.user;
  
  try {
    const {
      passengerId, // Receiving passengerId in request
      passengerName,
      passengerAge,
      passengerGender,
      passengerBerthChoice,
      passengerFoodChoice,
      passengerBedrollChoice,
      passengerConcession,
      concessionOpted,
      passengerIcardFlag,
      passengerCardType,
      passengerCardNumber,
      bookingStatusIndex,
      bookingStatus,
      bookingCoachId,
      bookingBerthNo,
      bookingBerthCode,
      currentStatusIndex,
      currentStatus,
      currentCoachId,
      currentBerthNo,
      currentBerthCode,
      passengerNetFare,
      currentBerthChoice,
      childBerthFlag,
      passengerNationality,
      insuranceIssued,
      policyNumber,
      forGoConcessionOpted,
    } = req.body;

    if (passengerId) {
      // ✅ UPDATE Passenger if passengerId exists
      const updateFields = [];
      const values = [];

      const fieldsToUpdate = {
        passengerName,
        passengerAge,
        passengerGender,
        passengerBerthChoice,
        passengerFoodChoice,
        passengerBedrollChoice,
        passengerConcession,
        concessionOpted,
        passengerIcardFlag,
        passengerCardType,
        passengerCardNumber,
        bookingStatusIndex,
        bookingStatus,
        bookingCoachId,
        bookingBerthNo,
        bookingBerthCode,
        currentStatusIndex,
        currentStatus,
        currentCoachId,
        currentBerthNo,
        currentBerthCode,
        passengerNetFare,
        currentBerthChoice,
        childBerthFlag,
        passengerNationality,
        insuranceIssued,
        policyNumber,
        forGoConcessionOpted,
      };

      Object.entries(fieldsToUpdate).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = ?`);
          values.push(value);
        }
      });

      if (updateFields.length > 0) {
        const updateQuery = `UPDATE passengers SET ${updateFields.join(", ")} WHERE passengerId = ?`;
        values.push(passengerId);

        connection.query(updateQuery, values, (updateErr, updateResults) => {
          if (updateErr) {
            console.error("Error updating passenger:", updateErr);
            return res.status(500).json({ message: "Database error", error: updateErr.message });
          }
          return res.status(200).json({ message: "Passenger updated successfully" });
        });
      } else {
        return res.status(200).json({ message: "No new data to update" });
      }

    } else {
      // ✅ INSERT New Passenger if passengerId does not exist
      const insertQuery = `
        INSERT INTO passengers (
          user_id, passengerName, passengerAge, passengerGender, 
          passengerBerthChoice, passengerFoodChoice, passengerBedrollChoice, 
          passengerConcession, concessionOpted, passengerIcardFlag, 
          passengerCardType, passengerCardNumber, bookingStatusIndex, 
          bookingStatus, bookingCoachId, bookingBerthNo, bookingBerthCode, 
          currentStatusIndex, currentStatus, currentCoachId, currentBerthNo, 
          currentBerthCode, passengerNetFare, currentBerthChoice, childBerthFlag, 
          passengerNationality, insuranceIssued, policyNumber, forGoConcessionOpted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        user_id, passengerName, passengerAge, passengerGender,
        passengerBerthChoice, passengerFoodChoice, passengerBedrollChoice,
        passengerConcession, concessionOpted, passengerIcardFlag,
        passengerCardType, passengerCardNumber, bookingStatusIndex,
        bookingStatus, bookingCoachId, bookingBerthNo, bookingBerthCode,
        currentStatusIndex, currentStatus, currentCoachId, currentBerthNo,
        currentBerthCode, passengerNetFare, currentBerthChoice, childBerthFlag,
        passengerNationality, insuranceIssued, policyNumber, forGoConcessionOpted
      ];

      connection.query(insertQuery, values, (insertErr, insertResults) => {
        if (insertErr) {
          console.error("Error adding passenger:", insertErr);
          return res.status(500).json({ message: "Database error", error: insertErr.message });
        }
        return res.status(201).json({ message: "Passenger added successfully", passengerId: insertResults.insertId });
      });
    }

  } catch (error) {
    console.error("Error details:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};



// Get Travellers
exports.getTravelers = async (req, res) => {
  try {
    const userId = req.user.user_id; // <-- FIXED

    const query = `
      SELECT *
      FROM passengers 
      WHERE user_id = ?;
    `;

    connection.query(query, [userId], (err, travelers) => {
      if (err) {
        console.error('Error fetching travelers:', err);
        return res.status(500).json({ message: "Internal server error" });
      }
      //    console.log("Travelers are ", travelers);
      res.status(200).json(travelers);
    });
  } catch (error) {
    console.error("Error fetching travelers:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Remove Traveller
exports.removeTraveller = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user;

    if (!id || !userId) {
      return res.status(400).json({ message: "Please provide a valid traveller id and user id" });
    }

    const query = `
      DELETE FROM passengers 
      WHERE passengerId = ? AND user_id = ?;
    `;

    connection.query(query, [id, userId], (err, result) => {
      if (err) {
        console.error('Error removing traveler:', err);
        return res.status(500).json({ message: "Internal server error" });
      }

      res.status(200).json({ message: "Traveller removed successfully" });
    });
  } catch (error) {
    console.error("Error removing traveler:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};



// API Function
exports.imageUpload = async (req, res) => {
  console.log("187 imageUpload API triggered..");
  try {
    const userId = req.params.id;
    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const imageUrl = req.file.path; // Cloudinary URL
    await connection.promise().query('UPDATE users SET img_url = ? WHERE user_id = ?', [imageUrl, userId]);
    res.status(200).json({ img_url: imageUrl, message: 'Image uploaded successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message, stack: error.stack });
  }
};