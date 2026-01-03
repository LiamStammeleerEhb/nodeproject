-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Jan 03, 2026 at 12:59 PM
-- Server version: 8.3.0
-- PHP Version: 8.2.18

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `dbnodeproject`
--

-- --------------------------------------------------------

--
-- Table structure for table `tblarticles`
--

DROP TABLE IF EXISTS `tblarticles`;
CREATE TABLE IF NOT EXISTS `tblarticles` (
  `articleID` int NOT NULL AUTO_INCREMENT,
  `articlename` text NOT NULL,
  `articlecontent` text NOT NULL,
  `publishedon` timestamp NOT NULL,
  `categoryID` int NOT NULL,
  `userid` int NOT NULL,
  PRIMARY KEY (`articleID`),
  KEY `categoryID` (`categoryID`),
  KEY `userid` (`userid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tblcategories`
--

DROP TABLE IF EXISTS `tblcategories`;
CREATE TABLE IF NOT EXISTS `tblcategories` (
  `categoryID` int NOT NULL AUTO_INCREMENT,
  `categoryname` text NOT NULL,
  PRIMARY KEY (`categoryID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tblusers`
--

DROP TABLE IF EXISTS `tblusers`;
CREATE TABLE IF NOT EXISTS `tblusers` (
  `userid` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `userpassword` text NOT NULL,
  PRIMARY KEY (`userid`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `tblusers`
--

INSERT INTO `tblusers` (`userid`, `username`, `userpassword`) VALUES
(1, 'Liam Stammeleer', 'admin');

--
-- Constraints for dumped tables
--

--
-- Constraints for table `tblarticles`
--
ALTER TABLE `tblarticles`
  ADD CONSTRAINT `tblarticles_ibfk_1` FOREIGN KEY (`userid`) REFERENCES `tblusers` (`userid`),
  ADD CONSTRAINT `tblarticles_ibfk_2` FOREIGN KEY (`categoryID`) REFERENCES `tblcategories` (`categoryID`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
