/**
 * 认证控制器（注册、登录、个人信息）
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');
const { success, error } = require('../utils/response');

const authController = {
  // 注册
  async register(req, res, next) {
    try {
      const { username, password, nickname, email, phone } = req.body;
      if (!username || !password) {
        return error(res, '用户名和密码不能为空');
      }
      if (username.length < 3 || username.length > 20) {
        return error(res, '用户名长度应为 3-20 个字符');
      }
      if (password.length < 6) {
        return error(res, '密码长度不能少于 6 位');
      }

      const existing = await User.findByUsername(username);
      if (existing) {
        return error(res, '用户名已存在');
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = await User.create({
        username, password: hashedPassword, nickname, email, phone,
      });

      success(res, { id: userId }, '注册成功');
    } catch (err) {
      next(err);
    }
  },

  // 登录
  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return error(res, '用户名和密码不能为空');
      }

      const user = await User.findByUsername(username);
      if (!user) {
        return error(res, '用户名或密码错误');
      }
      if (user.status === 0) {
        return error(res, '账号已被禁用，请联系管理员');
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return error(res, '用户名或密码错误');
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      success(res, {
        token,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          role: user.role,
        },
      }, '登录成功');
    } catch (err) {
      next(err);
    }
  },

  // 获取当前用户信息
  async getProfile(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return error(res, '用户不存在', 404);
      success(res, user);
    } catch (err) {
      next(err);
    }
  },

  // 更新个人信息
  async updateProfile(req, res, next) {
    try {
      const { nickname, email, phone, avatar } = req.body;
      await User.update(req.user.id, { nickname, email, phone, avatar });
      success(res, null, '更新成功');
    } catch (err) {
      next(err);
    }
  },

  // 修改密码
  async changePassword(req, res, next) {
    try {
      const { oldPassword, newPassword } = req.body;
      if (!oldPassword || !newPassword) return error(res, '请输入原密码和新密码');
      if (newPassword.length < 6) return error(res, '新密码长度不能少于 6 位');

      const user = await User.findByUsername(req.user.username);
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) return error(res, '原密码错误');

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await User.updatePassword(req.user.id, hashedPassword);
      success(res, null, '密码修改成功');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = authController;
