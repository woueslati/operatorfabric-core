/* Copyright (c) 2018, RTE (http://www.rte-france.com)
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

package org.lfenergy.operatorfabric.users.configuration.oauth2;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.lfenergy.operatorfabric.springtools.configuration.oauth.OAuth2GenericConfiguration;
import org.lfenergy.operatorfabric.springtools.configuration.oauth.OAuth2JwtProcessingUtilities;
import org.lfenergy.operatorfabric.springtools.configuration.oauth.OpFabJwtAuthenticationToken;
import org.lfenergy.operatorfabric.springtools.configuration.oauth.jwt.JwtProperties;
import org.lfenergy.operatorfabric.springtools.configuration.oauth.jwt.groups.GroupsProperties;
import org.lfenergy.operatorfabric.springtools.configuration.oauth.jwt.groups.GroupsUtils;
import org.lfenergy.operatorfabric.users.model.User;
import org.lfenergy.operatorfabric.users.model.UserData;
import org.lfenergy.operatorfabric.users.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.jwt.Jwt;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;

/**
 * Specific authentication configuration for the Users service It is necessary
 * because when converting the jwt token the {@link OAuth2GenericConfiguration}
 * relies on a user service cache and proxy to get user details, which is
 * useless in the case of the Users Service itself. Token conversion was made
 * necessary because access depending on roles is now used in the
 * WebSecurityConfiguration of this service.
 *
 * @author Alexandra Guironnet
 */
@Configuration
@Import({GroupsProperties.class, GroupsUtils.class, JwtProperties.class})
@Slf4j
@Data
public class OAuth2UsersConfiguration {

	@Autowired
	private JwtProperties jwtProperties;
	
	@Autowired
	private GroupsProperties groupsProperties;
	
	@Autowired
	private GroupsUtils groupsUtils;

	/**
	 * Generates a converter that converts {@link Jwt} to
	 * {@link OpFabJwtAuthenticationToken} whose principal is a {@link User} model
	 * object
	 *
	 * @return Converter from {@link Jwt} to {@link OpFabJwtAuthenticationToken}
	 */
	@Bean
	public Converter<Jwt, AbstractAuthenticationToken> opfabJwtConverter(@Autowired UserRepository userRepository) {

		return new Converter<Jwt, AbstractAuthenticationToken>() {

			@Override
			public AbstractAuthenticationToken convert(Jwt jwt) {
				String principalId = jwt.getClaimAsString(jwtProperties.getSubClaim());

				log.debug("USER " + principalId + " with the token : \n" + jwt.getTokenValue());

				OAuth2JwtProcessingUtilities.token.set(jwt);
				
				Optional<UserData> optionalUser = userRepository.findById(principalId);
				
				UserData user;
				if (!optionalUser.isPresent()) {
					user = createUserDataVirtualFromJwt(jwt);
					log.debug("user virtual(non existed in opfab) : " + user.toString());
				} else {
					user = optionalUser.get();
				}
				
				OAuth2JwtProcessingUtilities.token.remove();
				
				List<GrantedAuthority> authorities = new ArrayList<>();
				switch (groupsProperties.getMode()) {
					case JWT :
						// override the groups list from JWT mode
						user.setGroups(getGroupsList(jwt));
					case OPERATOR_FABRIC : 
						authorities = computeAuthorities(user);
						break;	
				}
					
				log.debug("user ["+principalId+"] has these roles " + authorities.toString() + " through the " + groupsProperties.getMode()+ " mode");
								
				return new OpFabJwtAuthenticationToken(jwt, user, authorities);
			}
			
            	
			/**
			 * create a temporal User from the jwt information without any group
			 * @param jwt jwt
			 * @return UserData
			 */
			private UserData createUserDataVirtualFromJwt(Jwt jwt) {
				String principalId = jwt.getClaimAsString(jwtProperties.getSubClaim());
				String givenName = null;
				String familyName = null;
				
				if (null != jwtProperties.getGivenNameClaim())
					givenName = jwt.getClaimAsString(jwtProperties.getGivenNameClaim());
				if (null != jwtProperties.getFamilyNameClaim())
					familyName = jwt.getClaimAsString(jwtProperties.getFamilyNameClaim());
								
				return new UserData(principalId, givenName, familyName, null);				
			}
		};
	}

	/**
	 * Creates Authority list from user's groups (ROLE_[group name])
	 * 
	 * @param user user model data
	 * @return list of authority
	 */
	public static List<GrantedAuthority> computeAuthorities(User user) {
		return AuthorityUtils
				.createAuthorityList(user.getGroups().stream().map(g -> "ROLE_" + g).toArray(size -> new String[size]));
	}
	

	/**
	 * Creates group list from a jwt
	 * 
	 * @param jwt user's token
	 * @return a group list
	 */
	public List<String> getGroupsList(Jwt jwt) {
		return groupsUtils.createGroupsList(jwt);
	}
}
