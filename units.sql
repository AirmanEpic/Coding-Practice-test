-- phpMyAdmin SQL Dump
-- version 5.0.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Jun 10, 2021 at 03:58 AM
-- Server version: 5.7.31
-- PHP Version: 7.3.21

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `units`
--

-- --------------------------------------------------------

--
-- Table structure for table `drones`
--

DROP TABLE IF EXISTS `drones`;
CREATE TABLE IF NOT EXISTS `drones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pos_current` int(11) NOT NULL,
  `pos_lat` float NOT NULL,
  `pos_long` float NOT NULL,
  `orientation` int(11) NOT NULL,
  `routine_id` text NOT NULL,
  `routine_tgt` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

INSERT INTO `drones` (`id`, `pos_current`, `pos_lat`, `pos_long`, `orientation`, `routine_id`, `routine_tgt`) VALUES
(5, 126065, 37.7843, -122.589, 360, '0', '2.6');
COMMIT;
-- --------------------------------------------------------

--
-- Table structure for table `positions`
--

DROP TABLE IF EXISTS `positions`;
CREATE TABLE IF NOT EXISTS `positions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pos_lat` float NOT NULL,
  `pos_long` float NOT NULL,
  `dt` bigint(20) NOT NULL,
  `drone` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `routes`
--

DROP TABLE IF EXISTS `routes`;
CREATE TABLE IF NOT EXISTS `routes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `waypoints_JSON` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;


INSERT INTO `routes` (`id`, `waypoints_JSON`) VALUES
(2, '[[-122.30602972027373,37.77597488808776],[-122.32405340586092,37.772424242927954],[-122.35628911684807,37.77583994507043],[-122.38497706050794,37.80646783465484],[-122.41763664332302,37.841043399399666],[-122.47102529059146,37.819985717663954],[-122.58978624814995,37.78397487723254]]');
COMMIT;
-- --------------------------------------------------------

--
-- Table structure for table `stations`
--

DROP TABLE IF EXISTS `stations`;
CREATE TABLE IF NOT EXISTS `stations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pos_lat` float NOT NULL,
  `pos_long` float NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
